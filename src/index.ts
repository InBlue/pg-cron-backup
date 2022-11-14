import * as S3 from "aws-sdk/clients/s3";
import { exec } from "child_process";
import { CronJob } from "cron";
import { createReadStream } from "fs";
import { basename } from "path";
import { error, log } from "./logger";

if (
	!process.env.ACCESS_KEY_ID ||
	!process.env.SECRET_ACCESS_KEY ||
	!process.env.HOST ||
	!process.env.BUCKET ||
	!process.env.CRON_SCHEDULE
)
	throw Error("All environment variables must be set");

export async function upload() {
	try {
		log("Beginning upload...");
		const client = new S3({
			endpoint: process.env.HOST,
			accessKeyId: process.env.ACCESS_KEY_ID!,
			secretAccessKey: process.env.SECRET_ACCESS_KEY!,
			signatureVersion: "v4",
		});

		const date = new Date().toISOString();
		const file = createReadStream("local-backup.tar.gz");

		const PutObject = {
			Bucket: process.env.BUCKET!,
			Key: basename(process.env.FOLDER ?? "/" + `backup-${date}.tar.gz`),
			Body: file,
		};

		await client.putObject(PutObject).promise();
		log("Upload completed");
	} catch (e) {
		error(`Upload error: ${(e as Error).message}`);
	}
}

async function dumpPG() {
	log("Dumping postgres database to file...");
	await new Promise((resolve, reject) => {
		exec(
			`pg_dump ${process.env.POSTGRES_URI} -F t | gzip > local-backup.tar.gz`,
			(err) => {
				if (err) return reject(JSON.stringify(err));
				log("Finished dump");
				resolve(null);
			}
		);
	});
}

async function _job() {
	try {
		log("Creating new backup...");
		await dumpPG();
		await upload();
		log("Backup completed");
	} catch (error: any) {
		error(error);
	}
}

const job = new CronJob(process.env.CRON_SCHEDULE, _job, null, true);

job.start();
log("Backup job started");
_job();
