const socket = io();

        const form = document.getElementById('form');
        const input = document.getElementById('input');
        const messages = document.getElementById('messages');
        const notificationText = document.querySelector('.notification-p');
        const username = localStorage.getItem('username') || `Guest${Math.floor(Math.random() * 1000)}`;
        const userList = document.getElementById('userList');
        const btn2 = document.getElementById('btn2');

        if(!username){
            window.location.href = '/';
        }

        document.querySelector('.container2').textContent = `Username: ${username}`;
        document.querySelector('.container3').textContent = `Online Users: ${username}`;

        socket.emit('new-user', username);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (input.value.trim()) {
                const timestamp = new Date().toLocaleTimeString();
                socket.emit('chat message', { message: input.value, timestamp, username });
                
                input.value = '';
            }

            
        });
        

        document.getElementById('btn2').addEventListener('click', () => {
            localStorage.removeItem('username');
            window.location.href = '/';
        })

        socket.on('chat message', ({ username: fromUser, message, timestamp }) => {
            const item = document.createElement('div');
            const msg = document.createElement('p');
            const time = document.createElement('span');
            // msg.textContent = `<strong>${fromUser}</strong>`;
            // item.innerHTML = `<strong>${username}</strong>`;  
            msg.innerHTML = `<strong>${fromUser}</strong>: ${message}`;
            
            time.textContent = timestamp;

            

            item.style.cssText = `
                background-color: #fff;
                min-height: 1rem;
                padding: 12px;
                margin-left: -10rem;
                margin-top: 2px;
                border-radius: 10px;
            `;

            time.style.fontSize = "10px";
            msg.style.margin = "-4px 0 -4px -1px";
            // msg.style.width = "20%";

            item.appendChild(msg);
            item.appendChild(time);
            messages.appendChild(item);
            // messages.scrollTop = messages.scrollHeight;
        });

        socket.on('userOnline', (data) => {
            const ul = document.getElementById('userList');
            ul.innerHTML = ''; 
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
            notificationText.style.marginLeft = '5px';
            setTimeout(() => notificationText.textContent = '', 3000);
        }

        socket.on("disconnect", () => {
            localStorage.clear();
        });