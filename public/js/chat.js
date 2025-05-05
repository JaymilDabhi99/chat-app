const socket = io();

        const form = document.getElementById('form');
        const input = document.getElementById('input');
        const messages = document.getElementById('messages');
        const notificationText = document.querySelector('.notification-p');
        const username = localStorage.getItem('username') || `Guest${Math.floor(Math.random() * 1000)}`;
        const userList = document.getElementById('userList');

        document.querySelector('.container2').textContent = `Username: ${username}`;

        socket.emit('new-user', username);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (input.value.trim()) {
                const timestamp = new Date().toLocaleTimeString();
                socket.emit('chat message', { message: input.value, timestamp, username });
                input.value = '';
            }
        });

        socket.on('chat message', ({ username: fromUser, message, timestamp }) => {
            const item = document.createElement('div');
            const msg = document.createElement('p');
            const time = document.createElement('span');

            msg.textContent = `${fromUser}: ${message}`;
            time.textContent = timestamp;

            item.style.cssText = `
        background-color: #fff;
        width: 35rem;
        padding: 12px;
        text-align: right;
        margin-left: -9rem;
        margin-top: 2px;
        border-radius: 10px;
      `;

            time.style.fontSize = "10px";
            msg.style.margin = "0 0 5px 10px";

            item.appendChild(msg);
            item.appendChild(time);
            messages.appendChild(item);
            messages.scrollTop = messages.scrollHeight;
        });

        socket.on('userOnline', (data) => {
            const ul = document.getElementById('userList');
            ul.innerHTML = ''; // Clear previous list
            const { userOnline } = data;
        
            for (const id in userOnline) {
                const li = document.createElement('li');
                li.innerText = userOnline[id];
                ul.appendChild(li);
            }
        });
        
        const msgInput = document.querySelector('#input');
        msgInput.addEventListener('focus', () => {
            socket.emit('typing', { username, typing: true });
        });
        msgInput.addEventListener('blur', () => {
            socket.emit('typing', { username, typing: false });
        });

        socket.on('typing_status', ({ username: typingUser, typing }) => {
            const indicator = document.querySelector('.indicator');
            indicator.textContent = typing && typingUser !== username ? `${typingUser} is typing...` : '';
        });

        socket.on('user-join', (joinedUser) => {
            showNotification(`${joinedUser} has joined the chat`);
        });

        socket.on('user-left', (leftUser) => {
            showNotification(`${leftUser} has left the chat`);
        });

        function showNotification(message) {
            notificationText.textContent = message;
            setTimeout(() => notificationText.textContent = '', 3000);
        }

        socket.on("disconnect", () => {
            localStorage.clear();
        });