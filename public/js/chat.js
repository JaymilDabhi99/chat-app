const socket = io();

        const form = document.getElementById('form');
        const input = document.getElementById('input');
        const messages = document.getElementById('messages');
        const notificationText = document.querySelector('.notification-p');
        const userList = document.getElementById('userList');
        const btn2 = document.getElementById('btn2');
        const username = localStorage.getItem('username');
        const room = localStorage.getItem('room');

        document.querySelector('.container2').textContent = `Username: ${username} | Room: ${room}`;
        
        // Join the specific room
        socket.emit('joinRoom', { username, room });


        // Form submission (send messages)
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (input.value.trim()) {
                const timestamp = new Date().toLocaleTimeString();
                socket.emit('chat message', { message: input.value, timestamp, username, room });
                input.value = '';
            }
        });
        
        // Leave room
        btn2.addEventListener('click', () => {
            localStorage.removeItem('username');
            localStorage.removeItem('room');
            window.location.href = '/';
        })

        // Load recent messages
        socket.on("loadMessages", (messagesArray) => {
          messagesArray.forEach(({ username, message, timestamp }) => {
            appendMessage(username, message, timestamp);
          });        
        });  

        // Handle new chat message
        socket.on('chat message', ({ username, message, timestamp }) => {
            appendMessage(username, message, timestamp);
        });

        // Update user list in room
        socket.on('userOnline', ({ onlineUsers }) => {
            userList.innerHTML = '';
            onlineUsers.forEach(user => {
                if(user !== username){
                    const li = document.createElement('li');
                    li.textContent = user;
                    userList.appendChild(li);
                }
            });
        });
        

        // Typing indicator
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

        // Join and leave notifications
        socket.on('user-join', (joinedUser) => {
            showNotification(`${joinedUser} has joined the chat`);
        });

        socket.on('user-left', (leftUser) => {
            showNotification(`${leftUser} has left the chat`);
        });


        // Clear localStorage on disconnect
        socket.on("disconnect", () => {
            localStorage.clear();
        });

        function appendMessage(username, message, timestamp){
            const item = document.createElement('div');
            const msg = document.createElement('p');
            const time = document.createElement('span');

            msg.innerHTML = `[<strong>${username}</strong>]: ${message}`;
            time.textContent = timestamp;

            item.style.cssText = `
              background-color: #fff;
              min-height: 1rem;
              padding: 12px;
              margin-left: -205px;
              margin-top: 2px;
              border-radius: 10px;
              width: 40%;
            `;

            if(username === localStorage.getItem('username')){
                item.style.marginLeft = '325px';
                item.style.backgroundColor = '#fff';
            }else{
                item.style.marginLeft = '3px';
                item.style.backgroundColor = '#fff';
            }

            time.style.fontSize = "10px";
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

        