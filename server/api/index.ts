import consola from "consola";
import { Request, Response, Router } from "express";
import { autoInjectable, container, singleton } from "tsyringe";
import { DiscordAuthentication } from "../auth/DiscordAuth";
import { IUser } from "../auth/IUser";
import Configuration from "../Configuration";
import { PrismaClient } from '@prisma/client';
import { OsuAuthentication } from "../auth/OsuAuth";

@singleton()
@autoInjectable()
export default class ApiRouting {
    public readonly router: Router = Router();
    public dbConnected = false;
    public configPath = '';
    private tournament: Configuration;
    private roles: string[] = [];
    private prisma: PrismaClient;

    constructor(config?: Configuration, prisma?: PrismaClient) {
        this.addRoutes();
        if (config === undefined)
            throw new Error("Configuration file not injected");
        if (prisma === undefined)
            throw new Error("Prisma not injected");

        this.prisma = prisma;
        this.tournament = config;
        this.tournament.config.discord.roles.forEach(role => {
            this.roles.push(role.name);
        });
    }

    private addRoutes() {
        this.router.get('/tournament', async (req: Request, res: Response) => {
            const t = this.tournament.config;

            if (t === null)
                return res.status(404).send("Tournament not found");

            const { host, name } = t;
            return res.send({ host, name })
        });

        this.router.get('/discord-roles', async (req: Request, res: Response) => {
            res.send(this.roles);
        });

        this.router.get('/finishSignup', async (req: Request, res: Response) => {

            if (!req.isAuthenticated()) {
                res.redirect('/');
                return;
            }

            const user = req.user as IUser;
            if (!user.discord || !user.osu ||
                !user.discord.displayName ||
                !user.discord.id ||
                !user.discord.token ||
                !user.osu.id ||
                !user.osu.displayName ||
                !user.osu.joinDate ||
                !user.osu.rank ||
                !user.osu.token ||
                !user.osu.country) {
                req.flash('error', "You're not authorized to perform this action.");
                res.redirect('/');
                return;
            }

            const osu = container.resolve<OsuAuthentication>(OsuAuthentication);
            if (!osu.isInRankRange(user.osu.bwsRank)) {
                user.failureReason = `osu! player is outside of rank range (Rank: ${user.osu.rank} BWS: ${user.osu.bwsRank}`;
                consola.warn(`${user.osu.displayName} is not allowed to participant in the tournament. Reason: BWS Rank is ${user.osu.bwsRank} (${user.osu.rank})`)    
                res.redirect('/checks/notallowed');
                return;
            }

            const p = await this.prisma.player.findUnique({
                where: {
                    id: user.osu.id
                }
            });

            // Redirect to this page is the participant is already in database.
            if (p) {
                res.redirect('/alreadySignedUp');
                return;
            }

            // Join participant to discord server.
            const d = container.resolve(DiscordAuthentication);

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const success = await d.discordJoin(user.discord.id!, user.discord.token!, user.osu.displayName!);

            if (success === 1) {
                res.redirect('/full');
                return;
            } else if (success === 0) {
                await this.prisma.player.create({
                    data: {
                        id: user.osu.id,
                        discordId: BigInt(user.discord.id),
                        username: user.osu.displayName,
                        discordUsername: user.discord.displayName,
                        signupDate: new Date(),
                        osuSignupDate: user.osu.joinDate,
                        country: user.osu.country,
                        rank: user.osu.rank,
                        bwsRank: user.osu.bwsRank,
                        badges: user.osu.badgeCount,
                        termsAccepted: true,
                    }
                });
                res.redirect('/done')
                consola.success(`${user.osu.displayName} / ${user.discord.displayName} (${user.osu.rank.toLocaleString()}) has signed up successfully!`);
                return;
            }
            req.flash('error', "Failed to sign you up, please try again later.");
            res.redirect('/')
        });

        this.router.get('/players', async (req: Request, res: Response) => {
            const limit = parseInt(req.query["limit"] as string) || undefined;
            const skip = parseInt(req.query["skip"] as string) || undefined;
            console.log(`${new Date().toISOString()}:  GET /participants: getting participants at skip: ${skip} and limit ${limit}`);
            const participants = await this.prisma.player.findMany({
                select: {
                    id: true,
                    username: true,
                    signupDate: true,
                    country: true,
                    rank: true,
                    bwsRank: true
                },
                skip: skip,
                take: limit,
                orderBy: {
                    bwsRank: 'asc'
                }
            });
            const count = await this.prisma.player.count();
            res.send({ count, participants })
        });
    }
}
