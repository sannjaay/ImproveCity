export interface User {
    _id?: string;
    email: string;
    password: string;
    name: string;
    isAdmin: true;
    createdAt: number;
    data: Record<string, any>
}