/*
 * Display the characters randomly in 3D
 * inspired by https://www.recursive.design/
 *
 * Move the mouse to rotate the 3D letter soup
 *
 * Click to add more characters from the sentence
 * to the soup.
 */

const mouseInputP = true;

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

// Samples used to smooth input
let dataSamples = new Array(dataSmoothingSampleSize);
// Samples used to calculate baseline
let baselineSamples = new Array(baselineSamplingSize);
let dataSampleAvg, dataSampleTrend;

// Holds our drawable objects.
let tokens = [];

// Data input gets assigned to this var.
let inData = 0;
// Baseline value from which mapping is calculating.
let baseline = 0;
let portButton;

let rot = 0;

let pressing = 0;
let zoomTarget = {x: 0, y: 0};

let font;

function preload() {
  font = loadFont("reglo.otf");
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  blendMode(BLEND);

  textFont(font);
  textSize(40);
  textAlign(CENTER, CENTER);
  perspective(0.3, 1);

  // Add metadata to our sentences and push into our tokens array.
  for (let sentence of sentences) {
    let token = tokenize(sentence);
    tokens.push(token);
  }

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
  
  populateInitDataSamples(dataSamples);
  populateInitDataSamples(baselineSamples);
  
  if (frameCount % (1*60) == 0) {
    addDataSample(baselineSamples);
    let baselineSamplesAvg = baselineSamples.reduce((acc, curr) => acc + curr) / baselineSamples.length;
    if (baselineSamples[0] - baselineSamplingDeviation < baselineSamplesAvg && baselineSamples[0] + baselineSamplingDeviation > baselineSamplesAvg) {
      let prevBaseline = baseline;
      baseline = baselineSamples[0];
      console.log(`Created a new baseline at ${baseline} previous was ${prevBaseline}`)
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
  
  //const zoom = map(dataSampleAvg, baseline, baseline + 20, zoomEnd, zoomInit, true);
  //const zoom = map(mouseX, 0, width, zoomInit, zoomEnd, true);

  const zoom = 
    mouseInputP ? 
    map(mouseX, 0, width, zoomInit, zoomEnd, true) : 
    map(dataSampleAvg, baseline, baseline + 20, zoomEnd, zoomInit, true); 

  translate(0, 0, zoom);
  //Rotate around the y with the mouse
  rot += 0.1;
  //rotateY(rot);

  //Go through the characters
  for (let i in tokens) {
    //Counter rotate so they always face the screen
    //rotateY(-rot);
    
    //Adjust opacity depending on word "status".
    fadeInOrOut(tokens[i]);
    
    //Draw them in their 3D position
    push();
    translate(tokens[i].x, tokens[i].y, tokens[i].z);
    drawText(tokens[i]);
    pop();
    //Undo rotation and translation
    //rotateY(rot);
    //translate(-tokens[i].x, -tokens[i].y, -tokens[i].z);
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

function populateInitDataSamples(sampleArray) {
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

function tokenize(entity) {
  return {
    word: entity,
    x: xForm(),
    y: yForm(),
    z: zForm(),
    opacity: 255,
    timeOn: timeOnForm(),
    timeOff: timeOffForm(),
    status: "fadedIn"
  };
}

function resetWord(word) {
  word.x = xForm();
  word.y = yForm();
  word.z = zForm();
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
