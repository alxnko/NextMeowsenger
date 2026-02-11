
const mockSendAutoInvite = async (userId) => {
    // Simulate a network delay of 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
};

const runSequential = async (skippedUsers) => {
    const start = performance.now();
    let sentCount = 0;
    for (const skippedUser of skippedUsers) {
        const sent = await mockSendAutoInvite(skippedUser.id);
        if (sent) sentCount++;
    }
    const end = performance.now();
    return { time: end - start, sentCount };
};

const runParallel = async (skippedUsers) => {
    const start = performance.now();
    const results = await Promise.all(
        skippedUsers.map(skippedUser => mockSendAutoInvite(skippedUser.id))
    );
    const sentCount = results.filter(Boolean).length;
    const end = performance.now();
    return { time: end - start, sentCount };
};

const skippedUsers = Array.from({ length: 10 }, (_, i) => ({ id: `user-${i}`, username: `user${i}` }));

console.log(`Running benchmark with ${skippedUsers.length} users...`);

(async () => {
    const sequential = await runSequential(skippedUsers);
    console.log(`Sequential: ${sequential.time.toFixed(2)}ms, Count: ${sequential.sentCount}`);

    const parallel = await runParallel(skippedUsers);
    console.log(`Parallel: ${parallel.time.toFixed(2)}ms, Count: ${parallel.sentCount}`);

    const improvement = ((sequential.time - parallel.time) / sequential.time) * 100;
    console.log(`Improvement: ${improvement.toFixed(2)}%`);
})();
