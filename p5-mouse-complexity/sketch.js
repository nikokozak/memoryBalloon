/*
 * Exploring ideas on internal complexity by
 * categorizing mouse movement based on 
 * gentleness and roughness.
 *
 * 09/12/24 @ 8:12pm, ITP floor
 */

//Array that holds the last 10 datapoints
let history = [];
const historySize = 10;
const trendSize = 3;

let weightedScore = 0;

//Baseline non-interactive data value
let baselineArr = [];
let baseline = -1;

function setup() {
    createCanvas(400, 400);
    textAlign(CENTER);
    colorMode(HSB);
}

let status = 0;

function draw() {
    status = processInput(mouseX);
    background(status, 100, 100);
    //console.log(score);
    fill('black');
    text(round(status), width/2, height/2);
}

function processInput(data) {
    //Get a baseline if we do not yet have one.
    if(baseline == -1) {
        baselineArr.push(data);
        if(baselineArr.length == 50) {
            baseline = baselineArr.reduce((partialSum, a) => partialSum + a, 0)/50;
        }
        return;
    }

    //Add data value to the history
    history.unshift(data);
    //Constrain the size
    history = history.slice(0, historySize);

    //Stop if we don't have enough info yet
    if(history.length < historySize) {
        return;
    }

    const average =  history.reduce((partialSum, a) => partialSum + a, 0)/history.length;
    const trend = history.slice(0, trendSize).reduce((partialSum, a) => partialSum + a, 0)/trendSize;

    const score = abs(trend - average);

    const weight = map(score, 0, 100, 0.005, 1, true);
    weightedScore = weightedScore*(1-weight) + score*weight;

    return weightedScore;
}