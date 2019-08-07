import { CronJob } from "cron";
import { Injectable } from "../injector";
import Farmer from "./farmer";
import Multimap from "../lib/multimap";

interface Cron {
  schedule(spec: string, cb: () => void): void;
}

@Injectable()
export default class CronProvider {
  constructor(private farmer: Farmer) {
    farmer.on("shutdown", () => {
      this.jobs.forEach(job => job.stop());
    });
  }

  private jobs: Multimap<string, CronJob> = new Multimap();

  public for(id: string) {
    return {
      schedule: (spec, cb) => {
        const job = new CronJob(spec, cb);
        this.jobs.add(id, job);
        job.start();
      }
    } as Cron;
  }
}
