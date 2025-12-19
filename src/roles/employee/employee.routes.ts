import { Routes } from "@angular/router";
import { EmployeeComponent } from "./employee.component";
import { CreateideaComponent } from "./createidea/createidea.component";
import { DashboardComponent } from "./dashboard/dashboard.component";

export const emproutes: Routes=[{


    path:'',
    component:EmployeeComponent,
    children:[
        {path:'dashboard',component:DashboardComponent},
        {path:'createidea',component:CreateideaComponent},
        {path:'employee',redirectTo:'empdashboard',pathMatch:'full'}
    ]
    }
]