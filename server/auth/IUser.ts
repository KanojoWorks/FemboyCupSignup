export interface IUser {
    discord: {
        id?: string;
        displayName?: string;
        token?: string;
    }
    osu: {
        id?: number;
        displayName?: string;
        rank: number;
        token?: string;
        joinDate?: Date;
        country?: string;
    }
    failureReason?: string;
}
