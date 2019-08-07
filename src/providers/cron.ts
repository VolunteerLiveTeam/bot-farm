import { CronJob} from "cron";
import { Injectable } from "../injector";

@Injectable()
export default class CronProvider {
    constructor() {}

    private jobs: CronJob[] = [];

    public schedule(sched: string, func: () => void) {
        this.jobs.push(new CronJob(sched, func, () => {}, true));
    }
}