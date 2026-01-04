import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Idea, Comment, Vote } from '../models/model';

const IDEAS_KEY = 'ideas';
const COMMENTS_KEY = 'comments';
const VOTES_KEY = 'votes';
const REVIEWS_KEY = 'reviews';

@Injectable({ providedIn: 'root' })
export class IdeaService {
  private ideas$ = new BehaviorSubject<Idea[]>(this.readIdeas());

  constructor() {}

  private safeRead<T>(key: string): T[] {
    try {
      if (
        typeof window !== 'undefined' &&
        window.localStorage &&
        typeof window.localStorage.getItem === 'function'
      ) {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      }
    } catch {}
    return [];
  }

  private safeWrite<T>(key: string, data: T[]) {
    try {
      if (
        typeof window !== 'undefined' &&
        window.localStorage &&
        typeof window.localStorage.setItem === 'function'
      ) {
        window.localStorage.setItem(key, JSON.stringify(data));
      }
    } catch {}
  }

  private readIdeas(): Idea[] {
    return this.safeRead<Idea>(IDEAS_KEY);
  }

  getAllIdeas(): Observable<Idea[]> {
    return this.ideas$.asObservable();
  }

  getIdeaById(id: number): Idea | undefined {
    return this.ideas$.value.find((i) => i.ideaID === id);
  }

  createIdea(partial: Partial<Idea>): Idea {
    const ideas = this.ideas$.value.slice();
    const nextId = ideas.length
      ? Math.max(...ideas.map((i) => i.ideaID)) + 1
      : 1;
    const newIdea: Idea = {
      ideaID: nextId,
      title: partial.title || 'Untitled',
      description: partial.description || '',
      categoryID: partial.categoryID || 0,
      submittedByUserID: partial.submittedByUserID || 0,
      submittedDate: partial.submittedDate || new Date().toISOString(),
      status: partial.status || 'UnderReview',
      category: partial.category || '',
      upvotes: 0,
      downvotes: 0,
    };

    ideas.unshift(newIdea);
    this.ideas$.next(ideas);
    this.safeWrite<Idea>(IDEAS_KEY, ideas);
    return newIdea;
  }

  addComment(c: Partial<Comment>): Comment {
    const comments = this.safeRead<Comment>(COMMENTS_KEY);
    const nextId = comments.length
      ? Math.max(...comments.map((x) => x.commentID)) + 1
      : 1;
    const comment: Comment = {
      commentID: nextId,
      ideaID: c.ideaID || 0,
      userID: c.userID || 0,
      text: c.text || '',
      createdDate: c.createdDate || new Date().toISOString(),
      userName: c.userName,
    };
    comments.push(comment);
    this.safeWrite<Comment>(COMMENTS_KEY, comments);
    return comment;
  }

  addReview(
    r: Partial<import('../models/model').Review>
  ): import('../models/model').Review {
    const reviews =
      this.safeRead<import('../models/model').Review>(REVIEWS_KEY);
    const nextId = reviews.length
      ? Math.max(...reviews.map((x) => x.reviewID || 0)) + 1
      : 1;
    const review: import('../models/model').Review = {
      reviewID: nextId,
      ideaID: r.ideaID || 0,
      reviewerID: r.reviewerID || 0,
      reviewerName: r.reviewerName,
      feedback: r.feedback || '',
      decision: r.decision || 'Reject',
      reviewDate: r.reviewDate || new Date().toISOString(),
    };
    reviews.push(review);
    this.safeWrite<import('../models/model').Review>(REVIEWS_KEY, reviews);

    // update idea status based on decision
    if (review.decision === 'Approve') {
      this.setIdeaStatus(review.ideaID, 'Approved');
    } else {
      this.setIdeaStatus(review.ideaID, 'Rejected');
    }

    return review;
  }

  getReviewsForIdea(ideaID: number) {
    return this.safeRead<import('../models/model').Review>(REVIEWS_KEY)
      .filter((r) => r.ideaID === ideaID)
      .sort((a, b) => (a.reviewID || 0) - (b.reviewID || 0));
  }

  setIdeaStatus(ideaID: number, status: 'Rejected' | 'UnderReview' | 'Approved') {
    const ideas = this.ideas$.value.slice();
    const idx = ideas.findIndex((i) => i.ideaID === ideaID);
    if (idx >= 0) {
      ideas[idx] = { ...ideas[idx], status };
      this.ideas$.next(ideas);
      this.safeWrite<Idea>(IDEAS_KEY, ideas);
    }
  }

  getCommentsForIdea(ideaID: number): Comment[] {
    return this.safeRead<Comment>(COMMENTS_KEY)
      .filter((c) => c.ideaID === ideaID)
      .sort((a, b) => a.commentID - b.commentID);
  }

  vote(ideaID: number, userID: number, voteType: 'Upvote' | 'Downvote') {
    const votes = this.safeRead<Vote>(VOTES_KEY);
    // Remove previous vote by this user for this idea
    const existingIdx = votes.findIndex(
      (v) => v.ideaID === ideaID && v.userID === userID
    );
    if (existingIdx >= 0) {
      // if same vote, toggle off
      if (votes[existingIdx].voteType === voteType) {
        votes.splice(existingIdx, 1);
      } else {
        votes[existingIdx].voteType = voteType;
      }
    } else {
      const nextId = votes.length
        ? Math.max(...votes.map((v) => v.voteID)) + 1
        : 1;
      votes.push({ voteID: nextId, ideaID, userID, voteType });
    }

    this.safeWrite<Vote>(VOTES_KEY, votes);
    this.recomputeCounts(ideaID);
  }

  private recomputeCounts(ideaID: number) {
    const votes = this.safeRead<Vote>(VOTES_KEY).filter(
      (v) => v.ideaID === ideaID
    );
    const up = votes.filter((v) => v.voteType === 'Upvote').length;
    const down = votes.filter((v) => v.voteType === 'Downvote').length;

    const ideas = this.ideas$.value.slice();
    const idx = ideas.findIndex((i) => i.ideaID === ideaID);
    if (idx >= 0) {
      ideas[idx] = { ...ideas[idx], upvotes: up, downvotes: down };
      this.ideas$.next(ideas);
      this.safeWrite<Idea>(IDEAS_KEY, ideas);
    }
  }

  // helper to seed some demo ideas (used if there are none yet)
  seedIfEmpty(currentUserId: number) {
    if (!this.ideas$.value.length) {
      this.createIdea({
        title: 'Make meetings shorter',
        description:
          'Try a standing 15 minute meeting to encourage concise updates.',
        categoryID: 1,
        submittedByUserID: currentUserId,
        status: 'UnderReview',
        category: 'Process',
      });
      this.createIdea({
        title: 'Introduce flexible hours',
        description:
          'Allow employees to choose flexible start/end times to improve work-life balance.',
        categoryID: 2,
        submittedByUserID: currentUserId,
        status: 'UnderReview',
        category: 'HR',
      });
    }
  }
}