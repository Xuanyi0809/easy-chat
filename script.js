// GoEasy 聊天室 JavaScript
// 配置 GoEasy AppKey
const APP_KEY = 'BC-7334176896d2476ba9d7fe273c9334b5';
const CHANNEL_NAME = 'goeasy_chat_room';

// 全局变量
let goeasy = null;
let currentUser = {
    nickname: '',
    id: ''
};
let isConnected = false;

// DOM 元素
const loginModal = document.getElementById('login-modal');
const nicknameInput = document.getElementById('nickname-input');
const joinBtn = document.getElementById('join-btn');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

// 初始化 GoEasy
function initGoEasy() {
    goeasy = new GoEasy({
        host: 'hangzhou.goeasy.io',
        appkey: APP_KEY,
        modules: ['pubsub']
    });

    // 连接事件监听
    goeasy.connect({
        onSuccess: function() {
            console.log('GoEasy 连接成功');
            updateConnectionStatus('connected', '已连接');
            subscribeChannel();
        },
        onFailed: function(error) {
            console.error('GoEasy 连接失败:', error);
            updateConnectionStatus('disconnected', '连接失败');
            showSystemMessage('连接服务器失败，请刷新页面重试');
        },
        onProgress: function(attempts) {
            updateConnectionStatus('connecting', '连接中...');
        }
    });

    // 断开连接监听
    goeasy.disconnected(function() {
        console.log('GoEasy 已断开连接');
        isConnected = false;
        updateConnectionStatus('disconnected', '连接已断开');
        disableInput();
        showSystemMessage('网络连接已断开，正在重新连接...');
    });

    // 重新连接成功
    goeasy.reconnected(function() {
        console.log('GoEasy 重新连接成功');
        isConnected = true;
        updateConnectionStatus('connected', '已连接');
        enableInput();
        showSystemMessage('已重新连接到服务器');
    });
}

// 订阅频道
function subscribeChannel() {
    goeasy.pubsub.subscribe({
        channel: CHANNEL_NAME,
        onMessage: function(message) {
            console.log('收到消息:', message);
            handleReceivedMessage(message);
        },
        onSuccess: function() {
            console.log('订阅频道成功');
            showSystemMessage('已加入聊天室，可以开始聊天了');
        },
        onFailed: function(error) {
            console.error('订阅频道失败:', error);
            showSystemMessage('加入聊天室失败');
        }
    });
}

// 处理接收到的消息
function handleReceivedMessage(message) {
    try {
        const data = JSON.parse(message.content);

        // 忽略自己发送的消息（GoEasy 会返回自己发送的消息）
        if (data.senderId === currentUser.id) {
            return;
        }

        // 显示其他人的消息
        if (data.type === 'system') {
            showSystemMessage(data.content);
        } else {
            showMessage(data.sender, data.content, false, data.timestamp);
        }
    } catch (e) {
        console.error('解析消息失败:', e);
    }
}

// 发送消息
function sendMessage() {
    const content = messageInput.value.trim();

    if (!content || !isConnected) {
        return;
    }

    const messageData = {
        sender: currentUser.nickname,
        senderId: currentUser.id,
        content: content,
        type: 'text',
        timestamp: Date.now()
    };

    goeasy.pubsub.publish({
        channel: CHANNEL_NAME,
        message: JSON.stringify(messageData),
        onSuccess: function() {
            console.log('消息发送成功');
            // 显示自己的消息
            showMessage(currentUser.nickname, content, true, messageData.timestamp);
            messageInput.value = '';
        },
        onFailed: function(error) {
            console.error('消息发送失败:', error);
            showSystemMessage('消息发送失败，请重试');
        }
    });
}

// 显示消息
function showMessage(sender, content, isSelf, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSelf ? 'self' : 'other'}`;

    const timeStr = formatTime(timestamp);

    // XSS 防护：使用 textContent 而非 innerHTML
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = content;

    if (!isSelf) {
        const nameDiv = document.createElement('div');
        nameDiv.className = 'sender-name';
        nameDiv.textContent = sender;
        messageDiv.appendChild(nameDiv);
    }

    messageDiv.appendChild(bubble);

    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = timeStr;
    messageDiv.appendChild(timeDiv);

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// 显示系统消息
function showSystemMessage(content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = content;

    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// 滚动到底部
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 更新连接状态
function updateConnectionStatus(status, text) {
    statusDot.className = 'status-dot ' + status;
    statusText.textContent = text;

    if (status === 'connected') {
        isConnected = true;
        enableInput();
    } else if (status === 'disconnected') {
        isConnected = false;
        disableInput();
    }
}

// 启用输入
function enableInput() {
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
}

// 禁用输入
function disableInput() {
    messageInput.disabled = true;
    sendBtn.disabled = true;
}

// 生成唯一用户 ID
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 事件监听器
joinBtn.addEventListener('click', function() {
    const nickname = nicknameInput.value.trim();

    if (!nickname) {
        alert('请输入昵称');
        nicknameInput.focus();
        return;
    }

    currentUser.nickname = nickname;
    currentUser.id = generateUserId();

    // 隐藏登录弹窗
    loginModal.classList.add('hidden');

    // 初始化 GoEasy
    initGoEasy();
});

nicknameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        joinBtn.click();
    }
});

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 输入框内容变化时更新发送按钮状态
messageInput.addEventListener('input', function() {
    sendBtn.disabled = !this.value.trim() || !isConnected;
});

// 页面加载完成后聚焦到昵称输入框
window.addEventListener('load', function() {
    nicknameInput.focus();
});

// 防止 XSS：禁用所有脚本执行（通过 CSP 在生产环境设置）
// 此处已在 showMessage 中使用 textContent 防护
