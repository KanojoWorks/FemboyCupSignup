import { NextFunction, Request, Response } from 'express';
import OsuStrategy, { PassportProfile } from "passport-osu";
import { AuthenticationClient } from "./AuthenticationClient";
import { IUser } from "./IUser";
import consola from "consola";
import { injectable } from "tsyringe";
import passport from "passport";

@injectable()
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
            passReqToCallback: true,
        }, (req: Request, _accessToken: string, _refreshToken: string, profile: PassportProfile, cb: any) => {
            if (!req.user) {
                const o: IUser = {
                    discord: {},
                    osu: {
                        id: profile.id,
                        displayName: profile.displayName,
                        token: _accessToken,
                        joinDate: new Date(profile._json.join_date),
                        country: profile._json.country.code,
                        rank: profile._json.statistics.global_rank
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
                    rank: profile._json.statistics.global_rank
                }

                return cb(null, o);
            }
        }));

        this.AddRoutes("osu");

        consola.success("osu! authentication routes are registered.")
    }

    public rankCheck(req: Request): boolean {
        const u = req.user as IUser;
        if (u.osu.rank < 100000 && u.osu.rank > 10000) 
            return true;
        else
            return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected callbackMiddleWare(req: Request, res: Response, next: NextFunction): void {
        const u = req.user as IUser;
        // User is allowed to join the discord, so go to verification.
        if (this.rankCheck(req)) 
            res.redirect('/checks/discord');
        // User failed verification so we redirect somewhere else for manual intervention or can customise the error.
         else {
            u.failureReason = "osu! player is outside of rank range";
            consola.warn(`${u.osu.displayName} is now allowed to participant in the tournament. Reason: Rank is ${u.osu.rank}`)
            res.redirect('/checks/notallowed');
        }
    }
}
