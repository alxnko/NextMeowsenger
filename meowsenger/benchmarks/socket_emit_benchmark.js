
const EventEmitter = require('events');

class MockSocket {
    constructor(id) {
        this.id = id;
    }
    emit(event, data) {
        // console.log(`Socket ${this.id} received ${event}`);
    }
}

class MockNamespace extends EventEmitter {
    constructor() {
        super();
        this.rooms = new Map();
    }

    to(room) {
        const rooms = Array.isArray(room) ? room : [room];
        return {
            emit: (event, data) => {
                const targets = new Set();
                rooms.forEach(r => {
                    const sockets = this.rooms.get(r) || [];
                    sockets.forEach(s => targets.add(s));
                });
                targets.forEach(s => s.emit(event, data));
            }
        };
    }

    join(socket, room) {
        if (!this.rooms.has(room)) {
            this.rooms.set(room, []);
        }
        this.rooms.get(room).push(socket);
    }
}

// This mock is simplified. Real socket.io overhead is more complex.
// Let's try to measure the overhead of the loop vs array call in terms of JS execution.

function benchmark() {
    const io = new MockNamespace();
    const userCount = 1000;
    const sockets = [];
    for (let i = 0; i < userCount; i++) {
        const s = new MockSocket(`s${i}`);
        sockets.push(s);
        io.join(s, `user_${i}`);
    }

    const rooms = sockets.map((_, i) => `user_${i}`);

    console.time('loop');
    for (let i = 0; i < 100; i++) {
        rooms.forEach(room => {
            io.to(room).emit('test', { data: 'test' });
        });
    }
    console.timeEnd('loop');

    console.time('array');
    for (let i = 0; i < 100; i++) {
        io.to(rooms).emit('test', { data: 'test' });
    }
    console.timeEnd('array');
}

benchmark();
