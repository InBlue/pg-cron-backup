import * as S3 from "aws-sdk/clients/s3";
import { exec } from "child_process";
import { CronJob } from "cron";
import { createReadStream } from "fs";
import { basename } from "path";

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
		console.log("Beginning upload...");
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
			body: file,
		};

		await client.putObject(PutObject).promise();
		console.log("Upload completed");
	} catch (e) {
		console.error(`Upload error: ${(e as Error).message}`);
	}
}

async function dumpPG() {
	console.log("Dumping postgres database to file...");
	await new Promise((resolve, reject) => {
		exec(
			`pg_dump ${process.env.POSTGRES_URI} -F t | gzip > local-backup.tar.gz`,
			(err) => {
				if (err) return reject(JSON.stringify(err));
				console.log("Finished dump");
				resolve(null);
			}
		);
	});
}

const job = new CronJob(
	process.env.CRON_SCHEDULE,
	async () => {
		try {
			console.log("Creating new backup...");
			await dumpPG();
			await upload();
			console.log("Backup completed");
		} catch (error) {
			console.error(error);
		}
	},
	null,
	true
);

job.start();
console.log("Backup job started");
