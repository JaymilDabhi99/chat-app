import { createPopup } from 'https://cdn.skypack.dev/@picmo/popup-picker';
    
const socket = io();

const username = localStorage.getItem('username');
        const room = localStorage.getItem('room');
        const toggleThemeBtn = document.getElementById('toggle-theme-btn');
        const form = document.getElementById('form');
        const input = document.getElementById('input');
        const messages = document.getElementById('messages');
        const notificationText = document.querySelector('.notification-p');
        const userList = document.getElementById('userList');
        const btn2 = document.getElementById('btn2');
        const triggerButton = document.querySelector('#emoji-btn');
        const fileInput = document.getElementById('fileInput');
        // const filenameDisplay = document.getElementById('filenameDisplay');
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



        let base64Media = null;
        let mediaType= null;
        uploadBtn.addEventListener('click', () => fileInput.click());

        // let isMediaReady = false;
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];  // Get the selected file
            console.log("Filename:",file.name);
            if(file){
                // input.textContent = `${file.name}`;
                const reader = new FileReader();
                mediaType = file.type.startsWith("image") ? "image" : "video";
                reader.onload = () => {
                    base64Media = reader.result;   // read base64 encoded data
                    console.log("Sending:", mediaType, base64Media);
                    //  sendMessage();
                    // isMediaReady = true;
                    // console.log("Sending:", mediaType, base64Media);
                };
                reader.readAsDataURL(file);  // convert file to base64 string
            }
        });


        
        // Join the specific room
        socket.emit('joinRoom', { username, room });


        // Form submission (send messages)

        // function sendMessage(){
           form.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = input.value.trim();
            if(message || base64Media){
                const timestamp = new Date().toLocaleTimeString('en-US',{
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });

                const messagePayload = {
                    timestamp,
                    username,
                    room
                };

                if(message){
                    messagePayload.message = message;
                }
                // console.log("Sending payload:", messagePayload);

                if(base64Media){
                    messagePayload.media = {
                        base64: base64Media,
                        type: mediaType
                    };
                }
                //  console.log("Emitting:", messagePayload);

                // console.log("Sending payload:", messagePayload);

                socket.emit('chat message', messagePayload);
                // console.log("Emitting socket message:", messagePayload);

                input.value = '';
                fileInput.value = '';
                base64Media = null;
                mediaType = null;  
            }
        });
        // }

    //     form.addEventListener('submit', (e) => {
    //     e.preventDefault();
    //     sendMessage();
    //    });
        
        
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
        socket.on('chat message', ({ username, message, timestamp, _id, media }) => {
            appendMessage(username, message, timestamp, _id, media);
        });

        // Load recent messages
        socket.on("loadMessages", (messagesArray) => {
            console.log("Msgarr:", messagesArray);
          messagesArray.forEach(({ username, message, timestamp, _id, media }) => {
            console.log("media:", media);
            appendMessage(username, message, timestamp, _id, media);
          });        
        });  

        socket.on('message-deleted', ({ _id }) => {
          const messageElement = document.querySelector(`[data-id="${_id}"]`);
          if(messageElement){
            messageElement.remove();
          }
        });

        socket.on('delivered', () => {
            
        })
        

        // Clear localStorage on disconnect
        // socket.on("disconnect", () => {
        //     localStorage.clear();
        // });

        function appendMessage(username, message, timestamp, _id, media = []){
            let text;
            // console.log("Mediaaaa:",media);
            const currentUser = localStorage.getItem('username');
            const item = document.createElement('div');
            const msg = document.createElement('p');
            const time = document.createElement('span');
            // const msgDiv = document.createElement('div');
            item.setAttribute('data-id', _id);

            // const user = onlineUsers[socket.id];

            if(message){
               text=message; 
            }
            msg.innerHTML = `<strong>${username}</strong>: ${message?text:''}`;
            time.textContent = timestamp;
            // item.textContent = notificationText;x`

            // console.log("Received media", msg.media);
            media.forEach(file => {
                // console.log("fileurl:",file.url);
                if(file.type === 'image' || file.url.startsWith('data:image')){
                    const img = document.createElement('img');
                    img.src = file.url;
                    img.alt = 'Image';
                    img.style.maxWidth = '189px';
                    img.style.display = 'block';
                    msg.appendChild(img);
                }else if(file.type === 'video' || file.url.startsWith('https://')){
                    const video = document.createElement('video');
                    video.src = file.url;
                    video.controls = true;
                    video.style.maxWidth = '189px';
                    video.style.display = 'block';
                    msg.appendChild(video);
                }
            });

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
                item.style.marginLeft = '392px';
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
