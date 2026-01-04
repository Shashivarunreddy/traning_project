import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Idea, Comment, Vote, Review } from '../models/model';

const IDEAS_KEY = 'ideas';
const COMMENTS_KEY = 'comments';
const VOTES_KEY = 'votes';
const REVIEWS_KEY = 'reviews';

@Injectable({ providedIn: 'root' })
export class IdeaService {
  private ideas$ = new BehaviorSubject<Idea[]>(this.readIdeas());

  constructor() {
    this.seedIfEmpty(1);
  }

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
    } catch { }
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
    } catch { }
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
    if (this.ideas$.value.length >= 5) return;

    const dummyIdeas: Partial<Idea>[] = [
      {
        title: 'Remote Work Stipend',
        description: 'Provide a monthly stipend for remote work expenses like internet and electricity.',
        categoryID: 2, // HR
        submittedByUserID: 4, // Alice
        status: 'Approved',
        category: 'HR'
      },
      {
        title: 'Weekly Tech Talks',
        description: 'Host weekly sessions where engineers can share knowledge and new technologies.',
        categoryID: 1, // Engineering? Process? Let's say Process
        submittedByUserID: 5, // Bob
        status: 'Approved',
        category: 'Process'
      },
      {
        title: 'Healthy Snacks in Pantry',
        description: 'Stock the pantry with healthier options like fruits and nuts instead of just chips.',
        categoryID: 2, // HR
        submittedByUserID: 6, // Charlie
        status: 'UnderReview',
        category: 'HR'
      },
      {
        title: 'Upgrade CI/CD Pipeline',
        description: 'Invest in faster build servers to reduce deployment time.',
        categoryID: 3, // Engineering/Tech
        submittedByUserID: 4, // Alice
        status: 'UnderReview',
        category: 'Technology'
      },
      {
        title: 'Quarterly Hackathons',
        description: 'Organize 2-day hackathons every quarter to foster innovation.',
        categoryID: 1, // Process
        submittedByUserID: 5, // Bob
        status: 'Rejected',
        category: 'Process'
      },
      {
        title: 'Pet Friendly Office',
        description: 'Allow well-behaved pets in the office on Fridays.',
        categoryID: 2, // HR
        submittedByUserID: 7, // Diana
        status: 'Rejected',
        category: 'HR'
      },
      {
        title: 'Mentorship Program',
        description: 'Formal mentorship program connecting seniors with juniors.',
        categoryID: 2, // HR
        submittedByUserID: 8, // Evan
        status: 'Approved',
        category: 'HR'
      },
      {
        title: 'Better Coffee Machines',
        description: 'Replace the old coffee machines with bean-to-cup ones.',
        categoryID: 4, // Operations?
        submittedByUserID: 9, // Fiona
        status: 'UnderReview',
        category: 'Facilities'
      },
      {
        title: 'Standing Desks for All',
        description: 'Provide adjustable standing desks for every employee.',
        categoryID: 4, // Facilities
        submittedByUserID: 10, // George
        status: 'UnderReview',
        category: 'Facilities'
      },
      {
        title: 'Team Building Offsites',
        description: 'Annual offsite retreats for team bonding.',
        categoryID: 2, // HR
        submittedByUserID: 6, // Charlie
        status: 'Approved',
        category: 'HR'
      },
      {
        title: 'Learning Budget Increase',
        description: 'Increase the annual learning and development budget per employee.',
        categoryID: 2, // HR
        submittedByUserID: 4, // Alice
        status: 'UnderReview',
        category: 'HR'
      },
      {
        title: 'Quiet Zones',
        description: 'Designate specific areas in the office as strict quiet zones.',
        categoryID: 4, // Facilities
        submittedByUserID: 8, // Evan
        status: 'Approved',
        category: 'Facilities'
      },
      {
        title: 'Charity Matching',
        description: 'Company matches employee donations to registered charities.',
        categoryID: 2, // HR
        submittedByUserID: 7, // Diana
        status: 'UnderReview',
        category: 'HR'
      },
      {
        title: 'Recycling Program',
        description: 'Implement a comprehensive recycling program in the office.',
        categoryID: 4, // Facilities
        submittedByUserID: 9, // Fiona
        status: 'Approved',
        category: 'Facilities'
      },
      {
        title: 'Gym Membership Subsidy',
        description: 'Offer 50% subsidy for local gym memberships.',
        categoryID: 2, // HR
        submittedByUserID: 5, // Bob
        status: 'Rejected',
        category: 'HR'
      }
    ];

    // Create Ideas
    const createdIdeas: Idea[] = [];
    for (const idea of dummyIdeas) {
      createdIdeas.push(this.createIdea(idea));
    }

    // Add Comments
    this.addComment({ ideaID: createdIdeas[0].ideaID, userID: 2, userName: 'John Manager', text: 'Great idea, fully support this.', createdDate: new Date().toISOString() });
    this.addComment({ ideaID: createdIdeas[0].ideaID, userID: 3, userName: 'Sarah HR', text: 'We are looking into the budget for this.', createdDate: new Date().toISOString() });
    this.addComment({ ideaID: createdIdeas[2].ideaID, userID: 4, userName: 'Alice Developer', text: 'Yes please! More fruits.', createdDate: new Date().toISOString() });
    this.addComment({ ideaID: createdIdeas[3].ideaID, userID: 2, userName: 'John Manager', text: 'This is critical for our velocity.', createdDate: new Date().toISOString() });
    this.addComment({ ideaID: createdIdeas[5].ideaID, userID: 3, userName: 'Sarah HR', text: 'Concerns about allergies need to be addressed first.', createdDate: new Date().toISOString() });

    // Add Votes (Randomize)
    const voters = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (const idea of createdIdeas) {
      // Random upvotes
      const upvoteCount = Math.floor(Math.random() * 5);
      for (let i = 0; i < upvoteCount; i++) {
        const voter = voters[Math.floor(Math.random() * voters.length)];
        this.vote(idea.ideaID, voter, 'Upvote');
      }
      // Random downvotes
      if (Math.random() > 0.7) {
        const voter = voters[Math.floor(Math.random() * voters.length)];
        this.vote(idea.ideaID, voter, 'Downvote');
      }
    }

    // Add Reviews (for Approved/Rejected)
    for (const idea of createdIdeas) {
      if (idea.status === 'Approved') {
        this.addReview({
          ideaID: idea.ideaID,
          reviewerID: 2, // John Manager
          reviewerName: 'John Manager',
          feedback: 'Approved after quarterly review.',
          decision: 'Approve',
          reviewDate: new Date().toISOString()
        });
      } else if (idea.status === 'Rejected') {
        this.addReview({
          ideaID: idea.ideaID,
          reviewerID: 2, // John Manager
          reviewerName: 'John Manager',
          feedback: 'Budget constraints do not allow this at the moment.',
          decision: 'Reject',
          reviewDate: new Date().toISOString()
        });
      }
    }
  }
}