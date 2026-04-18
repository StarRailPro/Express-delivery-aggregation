export interface ConcurrencyOptions {
  concurrency: number;
  delayBetweenBatches?: number;
}

export interface TaskResult<T> {
  item: T;
  success: boolean;
  error?: string;
  result?: unknown;
}

export async function runWithConcurrency<T>(
  items: T[],
  taskFn: (item: T) => Promise<unknown>,
  options: ConcurrencyOptions,
): Promise<TaskResult<T>[]> {
  const { concurrency, delayBetweenBatches = 200 } = options;

  if (items.length === 0) return [];

  const results: TaskResult<T>[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);

    const batchPromises = batch.map(async (item) => {
      try {
        const result = await taskFn(item);
        return { item, success: true, result } as TaskResult<T>;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { item, success: false, error: errorMessage } as TaskResult<T>;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (i + concurrency < items.length && delayBetweenBatches > 0) {
      await sleep(delayBetweenBatches);
    }
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
