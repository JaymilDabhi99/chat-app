import { createPopup } from 'https://cdn.skypack.dev/@picmo/popup-picker';
const socket = io();


        const toggleThemeBtn = document.getElementById('toggle-theme-btn');
        const form = document.getElementById('form');
        const input = document.getElementById('input');
        const messages = document.getElementById('messages');
        const notificationText = document.querySelector('.notification-p');
        const userList = document.getElementById('userList');
        const btn2 = document.getElementById('btn2');
        const username = localStorage.getItem('username');
        const room = localStorage.getItem('room');
        const triggerButton = document.querySelector('#emoji-btn');
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');

        document.body.classList.toggle('dark-mode', localStorage.getItem('theme') === 'dark');

        if(toggleThemeBtn){
            toggleThemeBtn.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
                localStorage.setItem('theme', currentTheme);
                toggleThemeBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
            })
        }

        document.querySelector('.container2').textContent = `Username: ${username} | Room: ${room}`;

        const picker = createPopup({hideOnEmojiSelect: false,}, {
            triggerElement: triggerButton,
            referenceElement: triggerButton,
            position: 'top-end'
        });

        triggerButton.addEventListener('click', (e) => {
            e.preventDefault(); 
            picker.toggle();
        });

        picker.addEventListener('emoji:select', event => {
            insertAtCursor(input, event.emoji);
        });



        let base64Image = null;
        uploadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if(file){
                const reader = new FileReader();
                reader.onloadend = () => {
                    base64Image = reader.result;
                    console.log("Base64 Image:", base64Image);
                };
                reader.readAsDataURL(file);
            }
        });


        
        // Join the specific room
        socket.emit('joinRoom', { username, room });


        // Form submission (send messages)
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const message = input.value.trim();
            if(!message && !base64Image) return;
                const timestamp = new Date().toLocaleTimeString('en-US',{
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                socket.emit('chat message', { message: input.value, timestamp, username, room });
                input.value = '';
                fileInput.value = '';
                base64Image = null;
        });
        
        // Leave room
        btn2.addEventListener('click', () => {
            localStorage.removeItem('username');
            localStorage.removeItem('room');
            window.location.href = '/';
        })


        // Join and leave notifications
        socket.on('user-join', (joinedUser) => {
            showNotification(`${joinedUser} has joined the chat`);
        });

        socket.on('user-left', (leftUser) => {
            showNotification(`${leftUser} has left the chat`);
        });

        // Update user list in room
        socket.on('userOnline', ({ onlineUsers }) => {
            userList.innerHTML = '';
            if (Array.isArray(onlineUsers)) {
        onlineUsers.forEach((user) => {
            if (user !== username) {
                const li = document.createElement('li');
                li.classList.add('online-user');
                li.innerHTML = `<span class="user-name">${user}</span>
                <span class="badge"></span>`;
                userList.appendChild(li);
            }
        });
    } else {
        console.warn('onlineUsers is not an array:', onlineUsers);
    }
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


        // Handle new chat message
        socket.on('chat message', ({ username, message, timestamp, _id }) => {
            appendMessage(username, message, timestamp, _id);
        });

        // Load recent messages
        socket.on("loadMessages", (messagesArray) => {
          messagesArray.forEach(({ username, message, timestamp, _id }) => {
            appendMessage(username, message, timestamp, _id);
          });        
        });  

        socket.on('message-deleted', ({ _id }) => {
          const messageElement = document.querySelector(`[data-id="${_id}"]`);
          if(messageElement){
            messageElement.remove();
          }
        });
        

        // Clear localStorage on disconnect
        socket.on("disconnect", () => {
            localStorage.clear();
        });

        function appendMessage(username, message, timestamp, _id){
            const currentUser = localStorage.getItem('username');
            const item = document.createElement('div');
            const msg = document.createElement('p');
            const time = document.createElement('span');
            // const msgDiv = document.createElement('div');
            item.setAttribute('data-id', _id);

            // const user = onlineUsers[socket.id];

            msg.innerHTML = `[<strong>${username}</strong>]: ${message}`;
            time.textContent = timestamp;
            // item.textContent = notificationText;

            item.style.cssText = `
              background-color: rgb(194 194 194);
              min-height: 1rem;
              padding: 12px;
              margin-left: -205px;
              margin-top: 2px;
              border-radius: 10px;
              width: 40%;
            `;

            item.classList.add('message-div'); 
            
            const menuIcon = document.createElement('span');
            menuIcon.className = 'menu-icon';
            menuIcon.textContent = '⋮';

            const dropdown = document.createElement('div');
            dropdown.className = 'dropdown-menu';

            if(username === currentUser){
               const deleteBtn = document.createElement('button');
               deleteBtn.textContent = 'Delete';

               deleteBtn.addEventListener('click', () => {
                socket.emit('delete-message', { _id });
               })

               dropdown.appendChild(deleteBtn);
            }

            menuIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            });

            // deleteBtn.addEventListener('click', () => {
            //     socket.emit('delete-message', { _id });
            // });

            // hide dropdown when clicked outside
            document.addEventListener('click', () => {
                dropdown.style.display = 'none';
            });
            

            if(username === localStorage.getItem('username')){
                item.style.marginLeft = '325px';
                item.style.backgroundColor = '#fff';
            }else{
                item.style.marginLeft = '3px';
                item.style.backgroundColor = '#fff';
            }

            time.style.fontSize = "11px";
            msg.style.margin = "-4px 0 -4px -1px";

            item.appendChild(msg);
            item.appendChild(time);
            item.appendChild(menuIcon);
            item.appendChild(dropdown);
            messages.appendChild(item);
            messages.append(notificationText);
        }

        function insertAtCursor(input, emoji){
           const [start,end] = [input.selectionStart, input.selectionEnd];
           const text = input.value;
           input.value = text.slice(0, start) + emoji + text.slice(end);
           input.selectionStart = input.selectionEnd = start + emoji.length;
           input.focus();
        }

        function showNotification(message) {
            // notificationText.textContent = messages;
            notificationText.textContent = message;
            notificationText.style.marginLeft = '5px';
            setTimeout(() => notificationText.textContent = '', 3000);
        }

        