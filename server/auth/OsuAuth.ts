import { NextFunction, Request, Response } from 'express';
import OsuStrategy, { PassportProfile } from "passport-osu";
import { AuthenticationClient } from "./AuthenticationClient";
import { IUser } from "./IUser";
import consola from "consola";
import { container, singleton } from "tsyringe";
import passport from "passport";
import { calculateBws } from '../util';
import { Badge } from '../IOsuApiUser';

@singleton()
export class OsuAuthentication extends AuthenticationClient {
    protected clientID: string = process.env.OSU2_CLIENT_ID || '';
    protected clientSecret: string = process.env.OSU2_CLIENT_SECRET || '';
    protected callbackURL: string = process.env.OSU2_CALLBACK_URL || '';
    RootURL = "/osu";

    constructor() {
        super();

        if (!this.VarsPresent())
            return;

        consola.info("Setting up osu! authentication routes...")

        passport.use(new OsuStrategy({
            type: 'StrategyOptionsWithRequest',
            clientID: this.clientID,
            clientSecret: this.clientSecret,
            callbackURL: this.callbackURL,
            userProfileUrl: 'https://osu.ppy.sh/api/v2/me/osu',
            passReqToCallback: true,
        }, (req: Request, _accessToken: string, _refreshToken: string, profile: PassportProfile, cb: any) => {
            let badgeCount = 0;

            if (profile._json.badges.length > 0)
                badgeCount = this.filterBadges(profile._json.badges);

            if (!req.user) {
                const o: IUser = {
                    discord: {},
                    osu: {
                        id: profile.id,
                        displayName: profile.displayName,
                        token: _accessToken,
                        joinDate: new Date(profile._json.join_date),
                        country: profile._json.country.code,
                        badgeCount: badgeCount,
                        bwsRank: calculateBws(profile._json.statistics.global_rank, badgeCount),
                        rank: profile._json.statistics.global_rank,
                    }
                }

                return cb(null, o);
            } else {
                const o: IUser = req.user as any;
                o.osu = {
                    id: profile.id,
                    displayName: profile.displayName,
                    token: _accessToken,
                    joinDate: new Date(profile._json.join_date),
                    country: profile._json.country.code,
                    badgeCount: badgeCount,
                    bwsRank: calculateBws(profile._json.statistics.global_rank, badgeCount),
                    rank: profile._json.statistics.global_rank,
                }

                return cb(null, o);
            }
        }));

        this.AddRoutes("osu");

        consola.success("osu! authentication routes are registered.")
    }

    public isInRankRange(bwsRank: number): boolean {
        if (bwsRank < 100000 && bwsRank > 10000)
            return true;
        else
            return false;
    }

    public filterBadges(badges: Badge[]): number {
        let badgeCount = 0
        const stupidBadges = [
            "contrib",
            "nomination",
            "assessment",
            "moderation",
            "spotlight",
            "mapper",
            "mapping",
            "aspire",
            "monthly",
            "exemplary",
            "outstanding",
            "longstanding",
            "idol",
            "pending"
        ];

        for (let i = 0; i < badges.length; i++) {
            const badge = badges[i];
            let bad = false;

            for (let j = 0; j < stupidBadges.length; j++) {
                if (badge.description.toLowerCase().indexOf(stupidBadges[j]) >= 0)
                    bad = true;
            }
            if (!bad) badgeCount++;
        }
        return badgeCount;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected callbackMiddleWare(req: Request, res: Response, next: NextFunction): void {
        const u = req.user as IUser;

        const that = container.resolve<OsuAuthentication>(OsuAuthentication)
        // User is allowed to join the discord, so go to verification.
        if (that.isInRankRange(u.osu.bwsRank))
            res.redirect('/checks/discord');
        // User failed verification so we redirect somewhere else for manual intervention or can customise the error.
        else {
            u.failureReason = `osu! player is outside of rank range (Rank: ${u.osu.rank} BWS: ${u.osu.bwsRank}`;
            consola.warn(`${u.osu.displayName} is not allowed to participant in the tournament. Reason: BWS Rank is ${u.osu.bwsRank} (${u.osu.rank})`)
            res.redirect('/checks/notallowed');
        }
    }
}
