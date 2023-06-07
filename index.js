let timeSection = document.querySelector("#time-section");
let button = document.querySelector("#offerBtn");
let offerValueMessage = document.querySelector("#offerValue");
var totalseconds = 10;
var clearInterval;
var CURRENTROOM = "";
let room = document.getElementById("room");
let roomsContainer = document.getElementById("rooms");
let currentUser = "";
var lastOffer = 0;
var roomname = document.getElementById("roomname");
let myName = '';
let currentValue = document.querySelector("#currentValue");
let time = document.querySelector("#time");
var offerOwner = '';

function GetRooms() {
    $.get("https://localhost:7115/GetRooms", function (rooms) {
        if (rooms == null) {
            alert("NO ROOMS AVAILABLE");
        }
        rooms.forEach(room => {
            const fileName = room;
            const parts = fileName.split(".");
            const firstPart = parts[0];
            const button = document.createElement("button");
            button.textContent = `Join ${firstPart}`; // Set the button text
            button.onclick = function () {
                Join(firstPart);
            };
            roomsContainer.appendChild(button);
        });
    });
}

async function Join(roomname) {
    currentUser = document.getElementById("username").value;
    if (currentUser.trim() == "") {
        alert("Please enter your name before joining the room.");
        return;
    }
    myName = currentUser;
    CURRENTROOM = roomname;
    room.style.display = "block";

    // Clear the existing child nodes
    while (roomsContainer.firstChild) {
        roomsContainer.removeChild(roomsContainer.firstChild);
    }
    var button = document.createElement('button');
    button.textContent = 'Leave Room: ' + CURRENTROOM;
    button.addEventListener('click', function () {
        // Function to execute when the button is clicked
        leaveRoom(CURRENTROOM);
    });
    roomsContainer.appendChild(button);

    await JoinRoom();
    await connection.invoke("JoinRoom", CURRENTROOM, currentUser);
}

function leaveRoom(roomname) {
    console.log('Leaving room: ' + roomname);
    connection.invoke('LeaveRoom', myName);
    document.body.innerHTML = "Left ROOM!";;
}

function showNotification(notification, color) {
    const notificationContainer = document.getElementById("notificationContainer");
    const newNotification = document.createElement("div");
    newNotification.textContent = `· ${notification}`;
    newNotification.classList.add("notification");
    newNotification.style.color = color; // Set the dynamic color
    notificationContainer.appendChild(newNotification);
    notificationContainer.scrollTop = notificationContainer.scrollHeight;

    // setTimeout(function () {
    //     notificationContainer.removeChild(newNotification);
    // }, 10000); // Remove the message after 10 seconds (10000 milliseconds)
}


async function JoinRoom() {
    try {
        await connection.start();

        $.get("https://localhost:7115/Room?room=" + CURRENTROOM, function (data, status) {
            console.log(data);
            roomname.innerText = `Room : ${CURRENTROOM}`;
            offerValueMessage.innerHTML = `Begin PRICE for ${CURRENTROOM} $ ` + data;
        });

        console.log("SignalR Connected");
    }
    catch (err) {
        console.log(err);
        setTimeout(() => {
            JoinRoom();
        }, 5000);
    }
}

async function IncreaseOffer() {
    clearTimeout(clearInterval);
    $.get(`https://localhost:7115/IncreaseRoom?room=${CURRENTROOM}&number=100`)
        .done(async function (data) {
            lastOffer = data;
            currentValue.innerHTML = `Last offer: ${data}$`;
            await connection.invoke("SendOffer", CURRENTROOM, myName);
            button.disabled = true;
            timeSection.style.display = "block";
            clearTimeout(clearInterval);
            startTimer();
        });
}

function startTimer() {
    totalseconds = 37;
    clearInterval = setInterval(async () => {
        --totalseconds;
        time.innerHTML = totalseconds;
        if (totalseconds <= 0) {
            button.disabled = false;
            clearTimeout(clearInterval);
            button.disabled = true;
            console.log(CURRENTROOM + " " + myName + " " + lastOffer);
            await connection.invoke("SendWinnerMessage", CURRENTROOM, offerOwner, lastOffer.toString());
            // Finish group;
        }
    }, 1000);
}


// Starts Here . . .

const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7115/offers")
    .configureLogging(signalR.LogLevel.Information)
    .build();

connection.on("ReceiveOffer", (message, data) => {
    data += 100;
    currentValue.innerHTML = message + data;
    button.disabled = false;
    totalseconds = 0;
    clearTimeout(clearInterval);
    timeSection.style.display = "none";
})

connection.on("RecieveRoomMessage", (message, data) => {
    currentValue.innerHTML = message + "\n with this offer : " + data + "$";
    console.log('OFFER ' + data);
    offerOwner = message;
    lastOffer = data;
    clearTimeout(clearInterval);
    startTimer();
    // button.disabled = true;
    // timeSection.style.display = "none";
})

connection.on("ReceiveJoinInfo", (user) => {
    console.log(`${user} connected to our room.`);
    showNotification(`${user} connected to our room.`, "green"); // Display message with blue color
})

connection.on("UserExited", (user) => {
    console.log(`${user} disconnected from our room.`);
    showNotification(`${user} disconnected from our room.`, "red"); // Display message with blue color
})

connection.on("ReceiveInfo", (room, username, offer) => {
    console.log("TRY 2" + room + " " + username + " " + offer);
    document.body.innerHTML = `GAME OVER !\n ${username} is the winner of the room ${room} with the bid of ${offer}`;
});

connection.onclose(async () => {
    leaveRoom();
})

GetRooms();