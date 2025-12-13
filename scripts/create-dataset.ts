#!/usr/bin/env tsx

/**
 * Script to create the Hugging Face dataset for hf-wrapped cache.
 *
 * Usage:
 *   pnpm tsx scripts/create-dataset.ts
 *
 * If you want to create the dataset, set HF_TOKEN in your environment
 * or .env.local file. You can also set:
 *   - WRAPPED_DATASET_NAME (default: "hf-wrapped-2025")
 *   - WRAPPED_DATASET_ORG (default: "hf-wrapped")
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

// Load environment variables from .env.local if it exists
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
	config({ path: envPath });
}

const DATASET_NAME = process.env.WRAPPED_DATASET_NAME || "hf-wrapped-2025";
const ORGANIZATION = process.env.WRAPPED_DATASET_ORG || "hf-wrapped";
const HF_TOKEN = process.env.HF_TOKEN;

// TODO: Dataset publish is pending due to earlier blockers; keep this
//       script ready to resume once resolved.

if (!HF_TOKEN) {
	console.log("ℹ️ HF_TOKEN not set; skipping dataset creation.");
	console.log("   Add HF_TOKEN to .env.local to enable this script.");
	process.exit(0);
}

// TypeScript assertion: HF_TOKEN is guaranteed to be defined after the check above
const token = HF_TOKEN;

const DATASET_ID = `${ORGANIZATION}/${DATASET_NAME}`;

async function createDataset() {
	console.log(`📦 Creating dataset: ${DATASET_ID}`);
	console.log(`   Organization: ${ORGANIZATION}`);
	console.log(`   Dataset name: ${DATASET_NAME}\n`);

	try {
		const response = await fetch(
			"https://huggingface.co/api/repos/create",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					type: "dataset",
					name: DATASET_NAME,
					organization: ORGANIZATION,
				}),
			},
		);

		if (!response.ok) {
			const error = await response.text();
			if (error.includes("already exists")) {
				console.log(`✅ Dataset ${DATASET_ID} already exists!`);
				console.log("\n📝 Next steps:");
				console.log("   1. Add to your .env.local:");
				console.log(`      WRAPPED_DATASET_ID="${DATASET_ID}"`);
				console.log("      WRAPPED_DATASET_WRITE=true");
				console.log(`      HF_TOKEN=${token.substring(0, 10)}...`);
				return;
			}
			throw new Error(`Failed to create dataset: ${error}`);
		}

		// const result = await response.json();
		console.log("✅ Dataset created successfully!");
		console.log(`   URL: https://huggingface.co/datasets/${DATASET_ID}\n`);
		console.log("📝 Add these to your .env.local file:");
		console.log(`   WRAPPED_DATASET_ID="${DATASET_ID}"`);
		console.log("   WRAPPED_DATASET_WRITE=true");
		console.log(`   HF_TOKEN=${token.substring(0, 10)}...`);
	} catch (error) {
		console.error("❌ Error creating dataset:", error);
		process.exit(1);
	}
}

createDataset();
