
import assert from 'node:assert';

// Mocking the Socket.IO behavior we optimized
class MockNamespace {
    constructor() {
        this.emits = [];
    }
    to(room) {
        return {
            emit: (event, data) => {
                this.emits.push({ room, event, data });
            }
        };
    }
}

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('Verifying Batch Emission Logic...');

test('Batch emission sends to an array of rooms', () => {
    const io = new MockNamespace();
    const participants = [
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'user-3' }
    ];

    // Simulating the optimized code
    const participantRooms = participants.map(
        (p: any) => `user_${p.userId}`,
    );
    io.to(participantRooms).emit("refresh_chats", {
        chatId: 'chat-123',
    });

    assert.strictEqual(io.emits.length, 1);
    assert.deepStrictEqual(io.emits[0].room, ['user_user-1', 'user_user-2', 'user_user-3']);
    assert.strictEqual(io.emits[0].event, 'refresh_chats');
});

test('Batch emission with single participant', () => {
    const io = new MockNamespace();
    const participants = [
        { userId: 'user-1' }
    ];

    const participantRooms = participants.map(
        (p: any) => `user_${p.userId}`,
    );
    io.to(participantRooms).emit("refresh_chats", {
        chatId: 'chat-123',
    });

    assert.strictEqual(io.emits.length, 1);
    assert.deepStrictEqual(io.emits[0].room, ['user_user-1']);
});

console.log('Verification complete!');
