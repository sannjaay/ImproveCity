import { fetchLeaderboard } from "@/controllers/leaderboard";
import { verifyUser } from "@/middlewares/verifyUser";
import { Route } from "@/types/helpers";
import { bindRoutes } from "@/utils/helpers";
import { Router } from "express";

const routes: Route[] = [
    {
        method: 'get',
        path: '/',
        middleware: [verifyUser],
        outputHandler: fetchLeaderboard
    }
];

const leaderboardRoutes = Router();
bindRoutes(leaderboardRoutes, routes);

export default leaderboardRoutes;
