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
        bwsRank: number;
        token?: string;
        joinDate?: Date;
        country?: string;
        badgeCount: number;
    }
    failureReason?: string;
}
