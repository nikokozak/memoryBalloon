/*
 * Display the characters randomly in 3D
 * inspired by https://www.recursive.design/
 *
 * Move the mouse to rotate the 3D letter soup
 *
 * Click to add more characters from the sentence
 * to the soup.
 */

const sentences = [
   "The latex reminds me of skin.",
    "It looks like skin.",
    "I like to pinch it.",
    "It feels like I'm smacking someone.",
    "I love the materiality of it.",
    "Canal Rubber Supply is the shit.",
    "Turns out acrylic is really expensive.",
    "This doesn't hold air at all.",
    "It reminds me of a pregnant belly.",
    "I feel like I need consent to touch it.",
    "I want to oil it up.",
    "The pressure sensor is so smooth.",
    "We did blur better than Olafur.",
    "This is like analog blur.",
    "I like that it becomes clear when you're close to the screen.",
    "What if we fill it up with air?",
    "We need a latex allergy warning.",
    "If I push too hard a baby will pop out.",
    "Should we just put porn on it?",
    "Go on, you can push harder.",
    "She really enjoys pinching the balloon.",
    "Is it normal for it to sound like that?",
    "What if we put words in it?",
    "What if we put our conversations about the process in it?",
    "I like the idea of text.",
    "People seem to respond well to text.",
    "Oh, the colors look neat.",
    "It's like zooming into the world.",
    "Ideas are blurry.",
    "Como que the ideas need clarity.",
    "Esto no sirve.",
    "I'm not sure if this is good.",
    "WebGL is weird with blur.",
    "Maybe we should make OpenFrameworks user friendly.",
    "Hot Air feels like a good name.",
    "Let's leave it overnight and see if it loses air.",
    "It holds air so well.",
    "I wonder if they'll give us a dark room to show it.",
    "In Colombia we get parts from wherever we can."
  ];

const serial = new p5.WebSerial();
const maxTimeOn = 800;
const maxTimeOff = 800;
const zoomInit = 10000;
const zoomEnd = -50;
const baselimeSamplingTime = 500;

const opacityChangeRate = 1;
const dataSmoothingSampleSize = 15;
const dataTrendSampleSize = 5;
const baselineSamplingSize = 50;
const baselineSamplingDeviation = .1;

let dataSamples = new Array(dataSmoothingSampleSize);
let baselineSamples = new Array(baselineSamplingSize);
let dataSampleAvg, dataSampleTrend;

let inData = 0;
let portButton;
let baseline = 0;

let words = sentences.join("").match(/\b(\w+)\b/g);
let wordMap = [];

let rot = 0;

let pressing = 0;
let zoomTarget = {x: 0, y: 0};

let font;

function preload() {
  font = loadFont("reglo.otf");
}

function setup() {
  let renderer = createCanvas(windowWidth, windowHeight, WEBGL);
  
  blendMode(BLEND);
  
  textFont(font);
  textSize(40);
  textAlign(CENTER, CENTER);
  perspective(0.3, 1);

  //Initialize the soup with one set of characters
  addSentences();
  addSentences();
  //addWords();

  if (!navigator.serial) {
    alert("WebSerial is not supported in this browser. Try Chrome or MS Edge.");
    noLoop();
    return;
  }
  startSerial();
}



function draw() {
  push();
  angleMode(DEGREES);
  rotate(180);
  background(0);
  
  loadInitialDataSamples(dataSamples);
  loadInitialDataSamples(baselineSamples);
  
  if (frameCount % (30*60) == 0) {
    addDataSample(baselineSamples);
    let baselineSamplesAvg = baselineSamples.reduce((acc, curr) => acc + curr) / baselineSamples.length;
    if (baselineSamples[0] - baselineSamplingDeviation < baselineSamplesAvg && baselineSamples[0] + baselineSamplingDeviation > baselineSamplesAvg) {
      baseline = baselineSamples[0];
    }
    
  }
  addDataSample(dataSamples);
  dataSampleAvg = calcDataSampleAverage(dataSamples);
  dataSampleTrend = calcDataSamplePortionAverage(dataSamples, 0, dataTrendSampleSize);
  
  
  if (dataSampleTrend - dataSampleAvg > 10 && pressing == 0) {
    pressing == 1;
    zoomTarget = words[Math.floor(random(0, words.length - 1))];
  } else if (dataSampleTrend - dataSampleAvg < 0 && pressing == 1) {
    pressing = 0;
  }
  
  const zoom = map(dataSampleAvg, baseline, baseline + 20, zoomEnd, zoomInit, true);
  //const zoom = map(mouseX, 0, width, zoomInit, zoomEnd, true);
  translate(0, 0, zoom);
  //Rotate around the y with the mouse
  rot += 0.1;
  //rotateY(rot);

  //Go through the characters
  for (let i in wordMap) {
    //Counter rotate so they always face the screen
    //rotateY(-rot);
    
    //Adjust opacity depending on word "status".
    fadeInOrOut(wordMap[i]);
    
    //Draw them in their 3D position
    push();
    translate(wordMap[i].x, wordMap[i].y, wordMap[i].z);
    drawText(wordMap[i]);
    pop();
    //Undo rotation and translation
    //rotateY(rot);
    //translate(-wordMap[i].x, -wordMap[i].y, -wordMap[i].z);
  }
  
  //translate(0, 0, -zoom);
  pop();
}

function drawText(txt) {
  push();
  fill(255, txt.opacity);
  rectMode(CENTER);
  text(txt.word, 0, 0, 300, 300);
  pop();
}

function fadeInOrOut(word) {
  
  switch (word.status){
    case 'fadedIn': 
      word.timeOn += random(1, 10);
      break;
    case 'fadedOut':
      word.timeOff += random(1, 10);
      break
    case 'fadingIn':
      word.opacity += opacityChangeRate;
      if (word.opacity >= 255) {
        word.status = 'fadedIn';
        word.timeOn = 0;
      }
      break;
    case 'fadingOut':
      word.opacity -= opacityChangeRate;
      if (word.opacity <= 0) {
        word.status = 'fadedOut';
        word.timeOff = 0;
      }
  }
  
  if (word.status == 'fadedIn') {
    word.status = random(0, 100) < 0.5 ? 'fadingOut' : 'fadedIn';
    }
    
  if (word.timeOff > maxTimeOff && word.status == 'fadedOut') {
      resetWord(word);
      word.status = 'fadingIn';
    }
}

/*** Sampling Fns *****/

function loadInitialDataSamples(sampleArray) {
  while (sampleArray[0] == undefined) {
    addDataSample(sampleArray);
  }
  
  return sampleArray;
}

function addDataSample(sampleArray) {
  sampleArray.push(inData);
  sampleArray.shift();
  
  return sampleArray;
}

function calcDataSampleAverage(sampleArray) {
  return calcDataSamplePortionAverage(sampleArray, 0, sampleArray.length);
}

function calcDataSamplePortionAverage(sampleArray, init, end) {
  let sum = sampleArray.slice(init, end).reduce((acc, curr) => acc + curr, 0);
  return sum / (end - init);
}

let xForm = () => random(-width/4, width/4);
let yForm = () => random(-height/4, height/4);
let zForm = () => random(-width*8, width);
let timeOnForm = () => random(0, maxTimeOn);
let timeOffForm = () => random(0, maxTimeOff);

function addWords() {
  
  for (let word of words) {
    const params = {
      word: word,
      x: xForm(),
      y: yForm(),
      z: zForm(),
      opacity: 255,
      timeOn: timeOnForm(),
      timeOff: timeOffForm(),
      status: "fadedIn"
    };
    wordMap.push(params);
  }
}

function addSentences() {
  
  for (let sentence of sentences) {
    const params = {
      word: sentence,
      x: xForm(),
      y: yForm(),
      z: zForm(),
      opacity: 255,
      timeOn: timeOnForm(),
      timeOff: timeOffForm(),
      status: "fadedIn"
    };
    wordMap.push(params);
  }
}

function resetWord(word) {
  word.x = xForm();
  word.y = yForm();
  word.z = zForm();
  //word.timeOn = 0;
  //word.timeOff = timeOffForm();
  //word.status = "fadingIn";
}

/****************** SERIAL CALLBACK FUNCTIONS ******************/
/***************************************************************/
/***************************************************************/

function startSerial() {
  // if serial is available, add connect/disconnect listeners:
  navigator.serial.addEventListener("connect", portConnect);
  navigator.serial.addEventListener("disconnect", portDisconnect);
  // check for any ports that are available:
  serial.getPorts();
  // if there's no port chosen, choose one:
  serial.on("noport", makePortButton);
  // open whatever port is available:
  serial.on("portavailable", openPort);
  // handle serial errors:
  serial.on("requesterror", portError);
  // handle any incoming serial data:
  serial.on("data", serialEvent);
  serial.on("close", makePortButton);
}

// if there's no port selected,
// make a port select button appear:
function makePortButton() {
  // create and position a port chooser button:
  portButton = createButton("choose port");
  portButton.position(10, 10);
  // give the port button a mousepressed handler:
  portButton.mousePressed(choosePort);
}

// make the port selector window appear:
function choosePort() {
  if (portButton) portButton.show();
  serial.requestPort();
}

// open the selected port, and make the port
// button invisible:
function openPort() {
  // wait for the serial.open promise to return,
  // then call the initiateSerial function
  serial.open().then(initiateSerial);

  // once the port opens, let the user know:
  function initiateSerial() {
    console.log("port open");
    serial.print(201);
  }
  // hide the port button once a port is chosen:
  if (portButton) portButton.hide();
}

// pop up an alert if there's a port error:
function portError(err) {
  alert("Serial port error: " + err);
}
// read any incoming data as a string
// (assumes a newline at the end of it):
let targetPos = 0;
let timeoutIndex = null;

function serialEvent() {
  let data = Number(serial.readLine());
  
  if (data == 0) { return; }
  
  inData = data;

  if (!baseline) {
    baseline = inData;
  }
}

// try to connect if a new serial port
// gets added (i.e. plugged in via USB):
function portConnect() {
  console.log("port connected");
  serial.getPorts();
}

// if a port is disconnected:
function portDisconnect() {
  serial.close();
  console.log("port disconnected");
}

function closePort() {
  serial.close();
}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
