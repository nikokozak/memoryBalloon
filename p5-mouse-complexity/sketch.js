/*
 * Exploring ideas on internal complexity by
 * categorizing mouse movement based on 
 * gentleness and roughness.
 *
 * 09/12/24 @ 8:12pm, ITP floor
 */

/* TODO
- Add running guage for the sensitivity threshold that triggers the next phrase
*/

const serial = new p5.WebSerial();
let inData = 0;
let portButton;

//Array that holds the last 10 datapoints
let history = [];
const historySize = 10;
const trendSize = 3;

let weightedScore = 0;

//Baseline non-interactive data value
let baselineArr = [];
let baseline = -1;

//The numerator (rate) at which the score value falls
const decay = 1.05;

let p;

function setup() {
    createCanvas(windowWidth, windowHeight);
    //colorMode(HSB);

    if (!navigator.serial) {
        alert("WebSerial is not supported in this browser. Try Chrome or MS Edge.");
        noLoop();
        return;
      }
      startSerial();

      p = window.hotair;
      setPhrase();
}

let output = {
    rateOfChange: 0,
    score: 0,
    currentPressure: 0,
};

let buffer = 50;

function setPhrase() {
    const index = floor(random(0, phrases.length));
    used.push(phrases[index]);
    p.textContent = phrases[index];
    phrases = phrases.slice(index,1);

    if(phrases.length == 0) {
        phrases = used;
        used = [];
    }

    const h = p.getBoundingClientRect().height;
    const w = p.getBoundingClientRect().width;

    const randomLeft = random(buffer, window.innerWidth - w - buffer);
    const randomTop = random(buffer, window.innerHeight - h - buffer);
    p.style.setProperty('top', randomTop + 'px');
    p.style.setProperty('left', randomLeft + 'px');
}

let opacity = 255;
let animating = false;
let smoothScore = 0;

function draw() {
    background(0);

    smoothScore = smoothScore*0.9 + output.score*0.1;
    
    window.notice.style.setProperty('opacity', map(smoothScore, 0, 50, 0, 1, true));

    if(!animating){
        if( output.score > 30 && !p.classList.contains('shifting')) {
            p.classList.add('shifting');
            animating = true;
            jQuery(p).one( 'transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function(){
                setPhrase();
                animating = false;
            });
        }else if(output.score <= 30 && abs(output.currentPressure - baseline) < 1 && p.classList.contains('shifting')) {
            p.classList.remove('shifting');
            animating = true;
            jQuery(p).one( 'transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function(){
                animating = false;
            });
        }
    }
}

function processInput(data) {
    //Get a baseline if we do not yet have one.
    if(baseline == -1) {
        baselineArr.push(data);
        if(baselineArr.length == 50) {
            baseline = baselineArr.reduce((partialSum, a) => partialSum + a, 0)/50;
        }
        return ;
    }

    //Add data value to the history
    history.unshift(data);
    //Constrain the size
    history = history.slice(0, historySize);

    //Stop if we don't have enough info yet
    if(history.length < historySize) {
        return;
    }

    //Get average of the history
    const average =  history.reduce((partialSum, a) => partialSum + a, 0)/history.length;
    //Get average of last few inputs
    const trend = history.slice(0, trendSize).reduce((partialSum, a) => partialSum + a, 0)/trendSize;

    //Get recent rate of change
    const score = abs(trend - average);

    //If the score is high, update the weighted score
    if( score > weightedScore ) {
        weightedScore = score;
    } else {
        //else, let the weighted score decay
        weightedScore /= decay;
    }

    return {
        rateOfChange: score,
        score: weightedScore * 100,
        currentPressure: history[0],
    }
}

/************************* SERIAL CALLBACK FUNCTIONS **************************/
/******************************************************************************/

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
    serial.open({baudRate: 115200}).then(initiateSerial);
  
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
    inData = Number(serial.readLine());
    //console.log(inData);
    if(inData > 800) {
        const temp = processInput(inData);
        if( temp != null) {
            output = temp;
        }
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