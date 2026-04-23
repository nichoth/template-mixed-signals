export interface ApiResponse<T> {
    success:boolean;
    data?:T;
    error?:string;
}

export type { Counter, Todo, Todos } from './server/index.js'
