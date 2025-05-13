const socket = io();

        const form = document.getElementById('form');
        const input = document.getElementById('input');
        const messages = document.getElementById('messages');
        const notificationText = document.querySelector('.notification-p');
        const userList = document.getElementById('userList');
        const btn2 = document.getElementById('btn2');
        const username = localStorage.getItem('username');

        document.querySelector('.container2').textContent = `Username: ${username}`;
        
        socket.emit('userJoin');

        socket.emit('new-user', username);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (input.value.trim()) {
                const timestamp = new Date().toLocaleTimeString();
                socket.emit('chat message', { message: input.value, timestamp, username });
                input.value = '';
            }
        });
        

        btn2.addEventListener('click', () => {
            localStorage.removeItem('username');
            window.location.href = '/';
        })


        socket.on("loadmsgs", (messagesArray) => {
          messagesArray.forEach(({ username, message, timestamp }) => {
            appendMessage(username, message, timestamp);
          });        
        });  

        socket.on('chat message', ({ username, message, timestamp }) => {
            appendMessage(username, message, timestamp);
        });

        socket.on('userOnline', ({ onlineUser }) => {
            userList.innerHTML = '';
            for (const id in onlineUser) {
                if(onlineUser[id] != username){
                    const li = document.createElement('li');
                    li.textContent = onlineUser[id];
                    userList.appendChild(li);
                }
            }
        });
        
        const msgInput = document.getElementById('input');
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

        socket.on("disconnect", () => {
            localStorage.clear();
        });

        function appendMessage(username, message, timestamp){
            const item = document.createElement('div');
            const msg = document.createElement('p');
            const time = document.createElement('span');

            msg.innerHTML = `<strong>${username}:</strong> ${message}`;
            time.textContent = timestamp;

            item.style.cssText = `
              background-color: #fff;
              min-height: 1rem;
              padding: 12px;
              margin-left: -205px;
              margin-top: 2px;
              border-radius: 10px;
              width: 70%;
            `;

            time.style.fontStyle = "10px";
            msg.style.margin = "-4px 0 -4px -1px";

            item.appendChild(msg);
            item.appendChild(time);
            messages.appendChild(item);
        }

        function showNotification(message) {
            notificationText.textContent = message;
            notificationText.style.marginLeft = '5px';
            setTimeout(() => notificationText.textContent = '', 3000);
        }

        