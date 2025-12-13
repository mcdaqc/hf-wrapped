declare namespace NodeJS {
	interface ProcessEnv {
		[key: string]: string | undefined;
		WRAPPED_DATASET_ID?: string;
		WRAPPED_DATASET_WRITE?: string;
		WRAPPED_DATASET_CACHE_DIR?: string;
		HF_TOKEN?: string;
	}
}

declare const process: {
	env: NodeJS.ProcessEnv;
};
