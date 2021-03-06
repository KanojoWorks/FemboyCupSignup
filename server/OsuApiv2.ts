import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { container, singleton } from "tsyringe";
import { calculateBws } from "./util";
import consola from 'consola';
import rateLimit, { RateLimitedAxiosInstance } from 'axios-rate-limit';
import { OsuAuthentication } from "./auth/OsuAuth";
import { IOsuAPIUser } from "./IOsuApiUser";

@singleton()
export default class OsuApi2 {
    private tokenData: {
        token_type: string,
        expires_in: number,
        access_token: string
    }
    private axiosConfig: {
        headers: {
            Authorization: string
        }
    }
    private prisma: PrismaClient;
    private baseUrl = 'https://osu.ppy.sh';
    private http: RateLimitedAxiosInstance;

    constructor(prisma?: PrismaClient) {
        if (!prisma)
            throw new Error("Prisma was not injected");
        else
            this.prisma = prisma;

        this.axiosConfig = {
            headers: {
                Authorization: ''
            }
        }
    }

    public async initalise(): Promise<void> {
        const r = await axios.post('https://osu.ppy.sh/oauth/token', {
            client_id: `${process.env.OSU2_CLIENT_ID}`,
            client_secret: `${process.env.OSU2_CLIENT_SECRET}`,
            grant_type: "client_credentials",
            scope: "public"
        }, {
            headers: {
                'Accept': 'application/json',
                "Content-Type": "application/json"
            }
        });

        this.tokenData = r.data;
        this.axiosConfig.headers.Authorization = `${this.tokenData.token_type} ${this.tokenData.access_token}`

        this.http = rateLimit(axios.create(this.axiosConfig), { maxRequests: 10, perMilliseconds: 1000 });
    }

    public async updateRank(id: number): Promise<void> {
        const endpoint = `/api/v2/users/${id}/osu`
        try {
            const req = await this.http.get(`${this.baseUrl}${endpoint}`, this.axiosConfig);
            const result = req.data as IOsuAPIUser;
            const rank = result.statistics.global_rank;
            const osu = container.resolve<OsuAuthentication>(OsuAuthentication);
            const badgeCount = osu.filterBadges(result.badges);
            const bwsRank = calculateBws(rank, badgeCount);
            await this.prisma.player.update({
                where: {
                    id
                },
                data: {
                    rank,
                    bwsRank,
                    badges: badgeCount
                }
            });
        } catch (e) {
            consola.error(`Error updating rank: ${e}`)
        }
    }
}