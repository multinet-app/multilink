//global variable that defines the tasks to be shown to the user and the (randomized) order in which to show them
var taskList;
let workerID; // to be populated when the user goes through the consent form;
let currentTask; //start at task 0
let onTrials = false;

let participantCollection;

// let vis;

//bookkeeping vars
let studyTracking = {
  taskListObj: null,
  group: null,
  numConditions: null
};

let provenance;
let app;

//new provenance graph to keep track of all non-vis related interactions. answer attempts during trial questions, time on each section, accessing the help button, etc.
let studyProvenance;
let studyApp;


async function setUpStudyProvenance(label) {
  const initialState = {
    workerID, //gets value from global workerID variable
    event: label, //string describing what event triggered this state update; same as the label in provenance.applyAction
    time: new Date().toString(), //timestamp for the current state of the graph;
    startTime: new Date().toString() //timestamp for the current state of the graph;
  };

  function study(provenance) {
    return {
      currentState: () => provenance.graph().current.state
    };
  }

  //set global variables
  studyProvenance = ProvenanceLibrary.initProvenance(initialState);
  studyApp = study(studyProvenance);

  //push initial state to firestore
  await pushProvenance(studyApp.currentState(), true, "participant_actions");
}
//  SET LISTENER FOR CTRL OR COMMAND Z AND CALL PROVENANCE.GOBACKONESTEP();
//  SET LISTENER FOR CTRL OR COMMAND F AND focus the search box;

function KeyPress(e) {
  var evtobj = window.event ? event : e;

  if (
    (evtobj.keyCode == 90 && evtobj.ctrlKey) ||
    (evtobj.keyCode == 90 && evtobj.metaKey)
  ) {
    if (provenance) {
      provenance.goBackOneStep();
    } else {
      window.controller.model.provenance.goBackOneStep();
    }
    //send update to studyProvenance
    updateStudyProvenance('control Z used')

  }

  if (
    (evtobj.keyCode == 70 && evtobj.ctrlKey) ||
    (evtobj.keyCode == 70 && evtobj.metaKey)
  ) {
    evtobj.preventDefault();
    evtobj.stopPropagation();
    d3.select(".searchInput")
      .node()
      .focus();

      updateStudyProvenance('control F used')

  }


}

document.onkeydown = KeyPress;

var tabFocus = (function() {
  var stateKey,
    eventKey,
    keys = {
      hidden: "visibilitychange",
      webkitHidden: "webkitvisibilitychange",
      mozHidden: "mozvisibilitychange",
      msHidden: "msvisibilitychange"
    };
  for (stateKey in keys) {
    if (stateKey in document) {
      eventKey = keys[stateKey];
      break;
    }
  }
  return function(c) {
    if (c) document.addEventListener(eventKey, c);
    return !document[stateKey];
  };
})();

tabFocus(function() {
  //start counting 'unfocus time' and add to current taskObject;
  if (tabFocus()) {
    updateStudyProvenance("Focused Tab");
  } else {
    updateStudyProvenance("Unfocused Tab");
  }
  // document.title = tabFocus() ? 'Visible' : 'Not visible';
});

//common data validation and submission code
function screenTest(width, height) {
  let widthTest = window.screen.availWidth >= width;
  let heightTest = window.screen.availHeight >= height;

  //remove orientation from window.screen object
  let screenSpecs = {
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    width: window.screen.width,
    height: window.screen.height,
    colorDepth: window.screen.colorDepth,
    pixelDepth: window.screen.pixelDepth
  };

  return widthTest && heightTest ? screenSpecs : false;
}

//If there is a value, check for validity
d3.select("#answerBox").on("input", function() {
  updateAnswer(d3.select("#answerBox").property("value"));
});

//function that updates the answer in the side panel as well as in the results field in tasks
//answer is either an array of node objects or a string from the answer box;
function updateAnswer(answer) {
  //Update answer inside taskList;
  let taskObj = taskList[currentTask];
  let answerType = typeof answer;

  if (answerType === "string") {
    taskObj.answer.value = answer;
  } else {
    taskObj.answer.nodes = answer.map(a => {
      return { id: a.id, name: a.shortName };
    });

    let selectedList = d3
      .select("#selectedNodeList")
      .selectAll("li")
      .data(answer);

    let selectedListEnter = selectedList.enter().append("li");

    selectedList.exit().remove();

    selectedList = selectedListEnter.merge(selectedList);
    selectedList.text(d => d.shortName);
  }

  //validate the entire answer object, but error check for only the field that is being updated
  validateAnswer(taskObj.answer, answerType == "string" ? "value" : "nodes");
}

//function that checks answers for the trials.
function checkAnswer(answer) {
  let task = taskList[currentTask];

  let replyTypes = task.replyType;

  let correct = true;

  let errorMsg;
  if (replyTypes.includes("value")) {
    //check if number matches or is 'close enough'
    correct = correct && task.answer.value == task.answerKey.value;
    if (!correct) {
      errorMsg =
        "Try again!  <span class='hint'>Remember you can use tooltips to get an exact value</span>";
    }
  }

  if (replyTypes.includes("multipleNodeSelection")) {
    task.answer.nodes.map(
      n => (correct = correct && task.answerKey.nodes.find(an=>an==n.id))
    );
    if (!correct) {
      let numAnswers = task.answerKey.nodes.length;

      let numSelections = task.answer.nodes.length;

      let numCorrectAnswers = task.answer.nodes.filter(n =>
        task.answerKey.nodes.find(an => an == n.id)
      ).length;

      // console.log(numSelections,numCorrectAnswers , '/', numAnswers)
        if (numSelections > numAnswers) {
          if (numCorrectAnswers == numAnswers) {
            errorMsg =
              "Try again! <span class='hint'>Here's a hint: You have all " +
              numAnswers +
              " of the answers, but " +
              (numSelections - numAnswers) +
              "  extra nodes in there as well</span>";
          } else {
            errorMsg =
              "Try again!  <span class='hint'>Here's a hint: You have " +
              numCorrectAnswers +
              " out of " +
              numAnswers +
              " of the answers.</span>";
          }
        } else {
          errorMsg =
            "Try again! <span class='hint'>Here's a hint: You have " +
            numCorrectAnswers +
            " out of " +
            numAnswers +
            " of the answers.</span>";
        }

    }
  }

  if (replyTypes.includes("singleNodeSelection")) {
    correct = correct && task.answer.nodes[0] === task.answerKey.nodes[0];

    if (!correct) {
      errorMsg = "Try again!";
    }
  }

  return { correct, errorMsg };
}

//function to push non-vis related actions (like clicking on the help button or starting or finishing the trials) to the studyProvenance graph;
function updateStudyProvenance(label, additionalInfo) {
  if (track) {
    let action = {
      label,
      action: () => {
        const currentState = studyApp.currentState();

        currentState.secondsSinceLastAction =
          (Date.parse(new Date()) - Date.parse(currentState.time)) / 1000;
        currentState.totalElapsedMinutes =
          Math.round(
            (Date.parse(new Date()) - Date.parse(currentState.startTime)) / 600
          ) / 100;

        //add time stamp to the state graph
        currentState.time = new Date().toString();
        //Add label describing what the event was
        currentState.event = label;
        //Add any additional information here
        currentState.info = additionalInfo;

        //Add flag for what task user is on
        currentState.task = taskList ? taskList[currentTask].taskID : undefined;

        return currentState;
      },
      args: []
    };

    studyProvenance.applyAction(action);
    pushProvenance(studyApp.currentState(), false, "participant_actions");
  }
}
// Set submit button callback.
d3.select("#submitButton").on("click", async function() {
  //Enforce 'disabled' behavior on this 'button'
  if (d3.select("#submitButton").attr("disabled")) {
    return;
  }

  //TO DO validate answers that were not enforced with validateAnswer (such as a minimum number of selected nodes);
  let task = taskList[currentTask];
  let flexibleAnswer =
    task.replyType.includes("multipleNodeSelection") &&
    task.replyCount.type === "at least";

  //force validate answer;

  let isValid, errorMsg;
  if (flexibleAnswer) {
    let [isValid2, errorMSg2] = validateAnswer(task.answer, "nodes", true);
    isValid = isValid2;
    errorMsg = errorMSg2;
    if (task.replyType.includes("value")) {
      let [validateValue, a] = validateAnswer(task.answer, "value", true);
      isValid = isValid && validateValue;
    }
    if (!isValid) {
      updateStudyProvenance("submitted invalid answer", errorMsg);
      return;
    }
  }

  //if in trial mode, do not let proceed if not correct, do not collect feedback on difficulty and confidence since these are just trials;
  if (onTrials) {
    let correctObj = checkAnswer(task.answer);

    let correct = correctObj.correct;
    let errorMsg = correctObj.errorMsg;

    if (correct) {
      d3.select("#feedbackCard").style("display", "none");
      d3.select(".modalTrialFeedback").classed("is-active", true);
      updateStudyProvenance("submitted correct answer", task.answer);

      if (currentTask === taskList.length - 1) {
        d3.select("#nextTrialTask").text("Proceed to Survey");
      }

      // d3.select('#trialFeedback').select('.correctMsg').style('display','block');
      // d3.select('#nextTrialTask').style('display','block');
    } else {
      d3.select("#feedbackCard").style("display", "block");
      d3.select("#feedbackCard")
        .select(".errorMsg")
        .html(errorMsg);

      updateStudyProvenance("submitted incorrect answer", task.answer);

      // d3.select('#trialFeedback').select('.correctMsg').style('display','none');
      // d3.select('#nextTrialTask').style('display','none');
    }
  }

  if (track) {
    if (vis === "nodeLink") {
      let action = {
        label: "Finished Task",
        action: () => {
          const currentState = app.currentState();
          //add time stamp to the state graph
          currentState.time = new Date().toString();
          //Add label describing what the event was
          currentState.event = "Finished Task";
          return currentState;
        },
        args: []
      };

      provenance.applyAction(action);
      pushProvenance(app.currentState());
    } else {
      let action = {
        label: "Finished Task",
        action: () => {
          const currentState = window.controller.model.app.currentState();
          //add time stamp to the state graph
          currentState.time = new Date().toString();
          currentState.event = "Finished Task";
          return currentState;
        },
        args: []
      };

      window.controller.model.provenance.applyAction(action);
      pushProvenance(window.controller.model.app.currentState());
    }
  }

  taskList[currentTask].endTime = new Date().toString();
  taskList[currentTask].minutesToComplete =
    Math.round(
      Date.parse(taskList[currentTask].endTime) -
        Date.parse(taskList[currentTask].startTime)
    ) / 60000;

  //Only bring up modal for feedback if not in trial mode;
  if (!onTrials) {
    d3.select(".modalFeedback").classed("is-active", true);

    updateStudyProvenance("submitted valid answer", task.answer);
  }
});

d3.selectAll(".helpIcon").on("click", () => {
  d3.select(".quickStart").classed("is-active", true);
  updateStudyProvenance("opened Help");
});

d3.selectAll("#closeModal").on("click", () => {
  d3.select(".quickStart").classed("is-active", false);
  updateStudyProvenance("closed Help");
});

d3.select("#nextTask").on("click", async () => {
  let taskObj = taskList[currentTask];

  let selectedDifficulty = d3
    .selectAll("input[name=difficulty]")
    .filter(function() {
      return d3.select(this).property("checked");
    });

  let selectedConfidence = d3
    .selectAll("input[name=confidence]")
    .filter(function() {
      return d3.select(this).property("checked");
    });
  //check to see if something has been selected before allowing the user to continue:

  if (selectedDifficulty.size() === 0 || selectedConfidence.size() === 0) {
    //display error msg;
    d3.select(".modalFeedback")
      .select(".errorMsg")
      .style("display", "inline");
    return;
  } else {
    d3.select(".modalFeedback")
      .select(".errorMsg")
      .style("display", "none");
  }

  // grab any potential feedback from the user;
  let explanation = d3
    .select(".modalFeedback")
    .select(".textarea")
    .property("value");

  let difficulty =
    selectedDifficulty.size() > 0 ? selectedDifficulty.property("value") : "";
  let confidence =
    selectedConfidence.size() > 0 ? selectedConfidence.property("value") : "";

  taskObj.feedback = {
    difficulty,
    confidence,
    explanation
  };

  if (track) {
    //update taskList with the answer for that task.
    db.collection("results")
      .doc(workerID)
      .update({
        [taskObj.taskID + ".answer"]: taskObj.answer,
        [taskObj.taskID + ".feedback"]: taskObj.feedback,
        [taskObj.taskID + ".startTime"]: taskObj.startTime,
        [taskObj.taskID + ".endTime"]: taskObj.endTime,
        [taskObj.taskID + ".minutesToComplete"]: taskObj.minutesToComplete
      });
  }

  updateStudyProvenance("ended task - submitted feedback");

  //increment current task;
  if (currentTask < taskList.length - 1) {
    currentTask = currentTask + 1;
    //set startTime for next task;
    taskList[currentTask].startTime = new Date().toString();

    resetPanel();
    d3.select(".modalFeedback").classed("is-active", false);
  } else {
    d3.select(".hit").style("display", "none");

    if (track) {
      let participant = await db
        .collection(participantCollection)
        .doc(workerID)
        .get();

      let endTime = new Date().toString();
      let startTime = participant.data().startTime;

      //update endTime in database;
      db.collection(participantCollection)
        .doc(workerID)
        .set(
          {
            endTime,
            minutesToComplete: Math.round(
              (Date.parse(endTime) - Date.parse(startTime)) / 60000
            ) //60000 milliseconds in a minute
          },
          { merge: true }
        );
    }
    updateStudyProvenance("ended Study");
    experimentr.next();
  }
});


async function resetPanel() {
  updateStudyProvenance("started Task");

  let task = taskList[currentTask];
  task.startTime = new Date().toString();

  d3.selectAll(".taskShortcut").classed("currentTask", function() {
    return d3.select(this).attr("id") === taskList[currentTask].taskID;
  });

  //Only start off with the submit button enabled for when the task only requires an unspecified node count;

  let flexibleAnswer =
    task.replyType.includes("multipleNodeSelection") &&
    task.replyCount.type === "at least";

  // clear any values in the feedback or search box;
  d3.select(".modalFeedback")
    .select(".textarea")
    .property("value", "");

  d3.select(".searchInput").property("value", "");

  d3.select(".searchMsg").style("display", "none");

  d3.select("#answerBox").property("value", "");

  d3.selectAll(".submit").attr("disabled", flexibleAnswer ? null : true);

  // d3.select('#nextTrialTask').style('display','none');
  // d3.select('#trialFeedback').select('.errorMsg').style('display','none');
  // d3.select('#trialFeedback').select('.correctMsg').style('display','none');

  // //Clear Selected Node List
  d3.select("#selectedNodeList")
    .selectAll("li")
    .remove();

  //clear any selected Radio buttons in the feedback box;
  d3.select(".modalFeedback")
    .selectAll("input")
    .property("checked", false);

  //check for different reply types

  if (task.replyType.includes("value")) {
    d3.select("#valueAnswer").style("display", "inline");
  } else {
    d3.select("#valueAnswer").style("display", "none");
  }

  if (
    task.replyType.includes("singleNodeSelection") ||
    task.replyType.includes("multipleNodeSelection")
  ) {
    d3.select("#nodeAnswer").style("display", "block");
  } else {
    d3.select("#nodeAnswer").style("display", "none");
  }

  d3.select("#taskArea")
    // .select(".card-header-title")
    .select(".taskText")
    .text(task.prompt + " (" + task.taskID + ")");

  config = task.config;

  await loadNewGraph(config.graphFiles[config.loadedGraph]);

  if (vis === "nodeLink") {
    loadTask(task);
  } else {
    console.log()
    window.controller.loadTask(currentTask);
  }
}

async function pushProvenance(provGraph, initialState = false, collectionName) {
  //Only push provenance is tracking is set to true;
  if (!track) {
    return;
  }

  let overallStudyProvenance = collectionName ? true : false;
  collectionName = overallStudyProvenance
    ? collectionName
    : onTrials
    ? "trial_provenance"
    : "provenance";

  //create a single provenanceDoc for each user when capturing overall study timing, create a task specific one for capturing vis specific interactions;
  let docID = overallStudyProvenance
    ? workerID
    : workerID + "_" + taskList[currentTask].taskID;
  // Push the latest provenance graph to the firestore.
  let provGraphDoc = await db
    .collection(collectionName)
    .doc(docID)
    .get();

  let doc = provGraphDoc.data();

  let docSize = calcFirestoreDocSize(collectionName, docID, doc) / 1000000;

  // console.log("Provenance graph size for ", docID, " is ", docSize, " MB");
  // console.log("Provenance graph has ", doc, "elements", initialState);

  if (docSize > 0.75) {
    console.log(
      "Provenance Graph for this user is too large! Considering storing each state in its own document"
    );
  } else {
    let docRef = db.collection(collectionName).doc(docID);

    // only update if document exists and this is not the initial push
    if (doc && !initialState) {
      await docRef.update({
        update: new Date().toString(),
        provGraphs: firebase.firestore.FieldValue.arrayUnion(provGraph)
      });
    } else {
      await docRef.set({
        initialSetup: new Date().toString(),
        provGraphs: firebase.firestore.FieldValue.arrayUnion(provGraph)
      });
    }
  }
}
//Function to ensure that the workerID is a valid database document ID;
function sanitizeWorkerID(workerID) {
  // Must be valid UTF-8 characters
  // Must be no longer than 1,500 bytes
  // Cannot contain a forward slash (/)
  // Cannot solely consist of a single period (.) or double periods (..)
  // Cannot match the regular expression __.*__
  return workerID;
}

async function loadNewGraph(fileName) {
  // console.log('loading ', fileName)
  graph = await d3.json(fileName);

  // console.log(graph.links)
  //
  //update the datalist associated to the search box (in case the nodes in the new graph have changed)
 //if (vis === 'nodeLink'){
  d3.select("#search-input").attr("list", "characters");
  let inputParent = d3.select("#search-input").node().parentNode;

    let datalist = d3
      .select(inputParent)
      .selectAll("#characters")
      .data([0]);

    let enterSelection = datalist
      .enter()
      .append("datalist")
      .attr("id", "characters");

    datalist.exit().remove();

    datalist = enterSelection.merge(datalist);

    let options = datalist.selectAll("option").data(graph.nodes);

    let optionsEnter = options.enter().append("option");
    options.exit().remove();

    options = optionsEnter.merge(options);

    options.attr("value", d => d.shortName);
    options.attr("id", d => d.id);
    // options.attr('onclick',"console.log('clicked')");

    // options.on("click",console.log('clicked an option!'))
}

//validates answer
//validates the entire answer object before assigning the submit button enable/disabled;
//error checks the field specified to show any error msgs.
//force argument is true when this is run from the submit button. Forces error message to show up that wouldn't otherwise.
function validateAnswer(answer, errorCheckField, force = false) {
  let task = taskList[currentTask];
  let replyTypes = task.replyType;

  //infer type of answer
  let numSelectedNodes = answer.nodes.length;

  let isValid = true;
  let errorMsg;

  let isFlexibleAnswer =
    replyTypes.includes("multipleNodeSelection") &&
    task.replyCount.type == "at least";

  if (replyTypes.includes("singleNodeSelection")) {
    isValid = isValid && numSelectedNodes === 1;

    if (errorCheckField === "nodes") {
      if (numSelectedNodes > 1) {
        errorMsg =
          "Too many nodes selected, please select a single node as your answer.";
      }

      if (numSelectedNodes < 1) {
        errorMsg = "No nodes selected.";
      }
    }
  } else if (replyTypes.includes("multipleNodeSelection")) {
    //only naturally perform 'isValid' check for counts that are exactly
    if (task.replyCount.type === "exactly") {
      isValid = isValid && numSelectedNodes == task.replyCount.value;

      if (errorCheckField === "nodes") {
        if (numSelectedNodes < task.replyCount.value) {
          errorMsg =
            "Keep going! This question requires " +
            task.replyCount.value +
            " node selections.";
        }

        if (numSelectedNodes > task.replyCount.value) {
          errorMsg =
            "Too many nodes selected. This task requires " +
            task.replyCount.value +
            " node selections.";
        }

        if (numSelectedNodes < 1) {
          errorMsg = "No nodes selected.";
        }
      }
    }
  }

  if (replyTypes.includes("value")) {
    isValid = isValid && d3.select("#answerBox").property("value").length > 0;

    if (errorCheckField === "value") {
      if (d3.select("#answerBox").property("value").length < 1) {
        errorMsg = "Please enter a value in the answer box.";
        console.log("should be here");
      }
    }
  }

  //when running Validate answer with 'force' = true, then this is happening on submit;
  if (
    force &&
    errorCheckField === "nodes" &&
    task.replyCount.type === "at least"
  ) {
    console.log("forcing!");
    isValid = isValid && numSelectedNodes >= task.replyCount.value;
    if (numSelectedNodes < 1) {
      errorMsg = "No nodes selected!";
    } else if (numSelectedNodes < task.replyCount.value) {
      errorMsg = "Please select at least  " + task.replyCount.value + " nodes.";
    }
  }

  d3.select("#submitButton").attr(
    "disabled",
    isValid || isFlexibleAnswer ? null : true
  );
  //toggle visibility of error message;

  let errorMsgSelector =
    errorCheckField === "value"
      ? d3.select("#valueAnswer").select(".errorMsg")
      : d3.select("#nodeAnswer").select(".errorMsg");

  errorMsgSelector
    .style("display", !isValid ? "inline" : "none")
    .text(errorMsg);

  return [isValid, errorMsg];
}

//function that generates random 'completion code' for worker to input back into Mechanical Turk;
function makeid(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function getResults() {

  return; 
  let allResults = [];
  let allParticipants = [];
  let allProvenance = [];

  let allVisProvenance = [];

  // let ids = ['7eKPji','FaP5YL','MqknUo','GtVOYl','T391Hp','T7asXK','yXA0Sm'];

  let id= 'TestUser'

  // let dbDump = ids.map(async id => {
  //   db.collection(id)
  //     .get()
  //     .catch(function(error) {
  //       console.log("Error getting document:", error);
  //     })
  //     .then(function(querySnapshot) {
  //       querySnapshot.forEach(function(doc) {
  //         allProvenance.push({ worker: id, id: doc.id, data: doc.data() });
  //       });
  //     });

    let result = await db
      .collection("results")
      .doc(id)
      .get();

    allResults.push({ worker: id, data: result.data() });

    let participant = await db
      .collection("test_participants")
      .doc(id)
      .get();

    allParticipants.push({ worker: id, data: participant.data() });

    let provenance = await db
      .collection("participant_actions")
      .doc(id)
      .get();

    allProvenance.push({ worker: id, data: provenance.data() });


     
    db.collection('provenance')
      .get()
      .catch(function(error) {
        console.log("Error getting document:", error);
      })
      .then(function(querySnapshot) {
        querySnapshot.forEach(function(doc) {
          allVisProvenance.push({ id: doc.id, data: doc.data() });
        });

        saveToFile(JSON.stringify(allVisProvenance),'allVisProvenance.json');
      });



    saveToFile(JSON.stringify(allResults),'allResults.json');
    saveToFile(JSON.stringify(allParticipants),'allParticipants.json');
    saveToFile(JSON.stringify(allProvenance),'allProvenance.json');



  // });

}

async function loadTasks(visType, tasksType) {
  //reset currentTask to 0
  currentTask = 0;

  getResults();
  //Helper function to shuffle the order of tasks given - based on https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
      [array[i], array[j]] = [array[j], array[i]]; // swap elements
    }
  }

  //find out which group to delegate and load appropriate taskList json file; ;
  var conditionsRef = db.collection("studyTracking").doc("conditions");

  let conditionsObj = await conditionsRef.get().catch(function(error) {
    console.log("Error getting document:", error);
  });

  let taskListFiles = conditionsObj.data().tasks;
  let conditions = conditionsObj.data().conditionList;
  studyTracking.numConditions = conditions.length;

  let group;

  // dynamically assign a vistype according to firebase tracking
  if (visType === undefined) {
    group = conditionsObj.data().currentGroup;

    //update currentGroup
    db.collection("studyTracking")
      .doc("conditions")
      .set(
        {
          currentGroup: (group + 1) % studyTracking.numConditions
        },
        { merge: true }
      );
  } else {
    group = visType === "nodeLink" ? 0 : 1;
  }

  studyTracking.group = group;

  let selectedCondition = conditions[group];
  let selectedVis = selectedCondition.type;

  vis = selectedVis;

  //set the source for the quickStart guide image in the modal;
  d3.select(".quickStart")
    .select("img")
    .attr(
      "src",
      vis === "nodeLink"
        ? "training/nodeLink_quickStart.png"
        : "training/adjMatrix_quickStart.png"
    );

  d3.select(".quickStart")
    .select(".modal-card")
    .style("width", "calc(100vh - 100px)");

  //do an async load of the designated task list;
  console.log(taskListFiles,tasksType)
  let taskListObj = await d3.json(taskListFiles[tasksType]);
  studyTracking.taskListObj = taskListObj;

  let taskListEntries = Object.entries(taskListObj);

  if (shuffleTasks && !onTrials) {
    //Randomly order the tasks.
    shuffle(taskListEntries);
  }
  // insert order and taskID into each element in this list
  taskList = taskListEntries.map((t, i) => {
    let task = t[1];
    task.order = i;
    task.taskID = t[0];
    task.workerID = workerID;
    return task;
  });

  //remove divs that are irrelevant to the vis approach being used am/nl
  if (selectedVis === "nodeLink") {
    d3.selectAll(".adjMatrix").remove();
  } else {
    d3.selectAll(".nodeLink").remove();
  }

  //create a list of taskItems under the taskMenu;


//   <article class="message is-link">
//   <div class="message-header">
//     <p>Link</p>
//     <button class="delete" aria-label="delete"></button>
//   </div>
//   <div class="message-body">
//     Lorem ipsum dolor sit amet, consectetur adipiscing elit. <strong>Pellentesque risus mi</strong>, tempus quis placerat ut, porta nec nulla. Vestibulum rhoncus ac ex sit amet fringilla. Nullam gravida purus diam, et dictum <a>felis venenatis</a> efficitur. Aenean ac <em>eleifend lacus</em>, in mollis lectus. Donec sodales, arcu et sollicitudin porttitor, tortor urna tempor ligula, id porttitor mi magna a neque. Donec dui urna, vehicula et sem eget, facilisis sodales sem.
//   </div>
// </article>


  let taskButtons = d3.select('.taskMenu').select('.content').selectAll('article').data(taskList);

  let taskButtonsEnter = taskButtons.enter().append('article').attr('class','message is-link');

  let header = taskButtonsEnter.append('div').attr('class','message-header');

  header
  .append('p')

  header.append('a')
  .attr('class','button taskShortcut')


  taskButtonsEnter.append('div').attr('class','message-body');


  // taskButtonsEnter
  // .append('a')
  // .attr('class','button taskShortcut')

  // taskButtonsEnter
  // .append('p')


  taskButtons.exit().remove();

  taskButtons = taskButtonsEnter.merge(taskButtons)

  taskButtons.select('p')
  .text(d=>d.prompt)

  taskButtons.select('.message-body')
  .text(d=>d.hypothesis)

  taskButtons.select('a')
  .attr('id',d=>d.taskID)
  .text(d=>d.taskID)
  .on("click", function() {
    //set new currentTask then call resetPanel;
    currentTask = taskList.findIndex(t => t.taskID == d3.select(this).attr("id"));
    resetPanel();
  });



  //load script tags if this is the trials page or if there were no trials for this setup)

  if (tasksType === "trials" || !trials) {
    let scriptTags = {
      nodeLink: [
        "js/nodeLink/main_nodeLink.js",
        "js/nodeLink/helperFunctions.js"
      ],
      adjMatrix: [
        "js/adjMatrix/libs/reorder/science.v1.js",
        "js/adjMatrix/libs/reorder/tiny-queue.js",
        "js/adjMatrix/libs/reorder/reorder.v1.js",
        "js/adjMatrix/fill_config_settings.js",
        "js/adjMatrix/autocomplete.js",
        "js/adjMatrix/view.js",
        "js/adjMatrix/controller.js",
        "js/adjMatrix/model.js",
        "js/adjMatrix/helper_functions.js"
      ]
    };
    let cssTags = {
      nodeLink: [
        "css/nodeLink/node-link.css",
        "css/nodeLink/bulma-checkradio.min.css"
      ],
      adjMatrix: ["css/adjMatrix/adj-matrix.css"]
    };

    // //   dynamically load only js/css relevant to the vis approach being used;
    const loadAllScripts = async () => {
      return await Promise.all(
        scriptTags[selectedVis].map(async src => {
          return await loadScript(src, () => "");
        })
      );
    };

    await loadAllScripts();

    cssTags[selectedVis].map(href => {
      var newStyleSheet = document.createElement("link");
      newStyleSheet.href = href;
      newStyleSheet.rel = "stylesheet";
      d3.select("head")
        .node()
        .appendChild(newStyleSheet);
    });
  }
}

//function that loads in a .js script tag and only resolves the promise once the script is fully loaded
function loadScript(url, callback) {
  return new Promise(function(resolve, reject) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    if (script.readyState) {
      // only required for IE <9
      script.onreadystatechange = function() {
        if (
          script.readyState === "loaded" ||
          script.readyState === "complete"
        ) {
          script.onreadystatechange = null;
          callback();
          resolve();
        }
      };
    } else {
      //Others
      script.onload = function() {
        callback();
        resolve();
      };
    }

    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
  });
}

d3.select("#clear-selection").on("click", () => {
  // set app.currentState() selected to empty;

  d3.select(".searchMsg").style("display", "none");

  d3.select('.searchInput')
  .property('value','')
  if(vis == 'nodeLink'){
    let action = {
      label: "cleared all selected nodes",
      action: () => {
        const currentState = app.currentState();
        //add time stamp to the state graph
        currentState.time = new Date().toString()
        //Add label describing what the event was
        currentState.event = "cleared all selected nodes";
        //Update actual node data
        currentState.selected = [];
        currentState.userSelectedNeighbors = {};
        return currentState;
      },
      args: []
    };

    provenance.applyAction(action);
    pushProvenance(app.currentState());
  } else {
    window.controller.clear();
  }

  updateStudyProvenance('cleared all selections')

});
let val = d3.select("#search-input").on("change", function() {

  // let selectedOption = d3.select(this).property("value");
  //this = d3.select("#search-input"); // resets context
  let selectedOption = d3.select("#search-input").property("value").trim();

  //in case there are just spaces, this will reset it to 'empty'
  d3.select("#search-input").property("value",selectedOption);


  //empty search box;
  if (selectedOption.length === 0) {
    d3.select(".searchMsg").style("display", "none");
    return;
  }

  let searchSuccess = (vis === 'nodeLink') ?  searchFor(selectedOption): window.controller.view.search(selectedOption);

  //  if (searchSuccess === -1){
  //    d3.select('.searchMsg')
  //    .style('display','block')
  //    .text('Could not find a node with that name!');
  //  }

  if (searchSuccess === 1) {
    d3.select(".searchMsg").style("display", "none");
  }

  //  if (searchSuccess === 0){
  //   d3.select('.searchMsg')
  //   .style('display','block')
  //   .text(selectedOption + ' is already selected.');
  //  }

  updateStudyProvenance('searched for node',{'searchedNode':selectedOption,'success':searchSuccess})

});

d3.select('#searchButton').on("click",function(){

  let selectedOption = d3.select('.searchInput').property("value").trim();

  //empty search box;
  if (selectedOption.length === 0) {
    d3.select(".searchMsg")
      .style("display", "block")
      .text("Please enter a node name to search for!");
    return;
  }

    let searchSuccess = vis == 'nodeLink' ?  searchFor(selectedOption):  window.controller.view.search(selectedOption);

  if (searchSuccess === -1) {
    d3.select(".searchMsg")
      .style("display", "block")
      .text("Could not find a node with that name!");
  }

  if (searchSuccess === 1) {
    d3.select(".searchMsg").style("display", "none");

    // d3.select('#clear-selection').attr('disabled', null)
  }

  if (searchSuccess === 0) {
    d3.select(".searchMsg")
      .style("display", "block")
      .text(selectedOption + " is already selected.");
  }

  updateStudyProvenance('searched for node',{'searchedNode':selectedOption,'success':searchSuccess})

});

//Push an empty taskList to a new doc under the results or trials collection to start tracking the results
//collection is either 'trials' or 'results'
function trackResults(collection) {
  //create a pared down copy of this taskList to store in firebase (no need to store configs);
  let configLessTaskList = JSON.parse(
    JSON.stringify(studyTracking.taskListObj)
  );

  Object.keys(configLessTaskList).map(key => {
    delete configLessTaskList[key].config;
    configLessTaskList[key].visType = vis;
  });

  var taskListRef = db.collection(collection).doc(workerID);
  taskListRef.set(configLessTaskList);
}

function calcFirestoreDocSize(collectionName, docId, docObject) {
  let docNameSize = encodedLength(collectionName) + 16;
  let docIdType = typeof docId;
  if (docIdType === "string") {
    docNameSize += encodedLength(docId) + 1;
  } else {
    docNameSize += 8;
  }
  let docSize = docNameSize + calcObjSize(docObject);

  return docSize;
}
function encodedLength(str) {
  var len = str.length;
  for (let i = str.length - 1; i >= 0; i--) {
    var code = str.charCodeAt(i);
    if (code > 0x7f && code <= 0x7ff) {
      len++;
    } else if (code > 0x7ff && code <= 0xffff) {
      len += 2;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      i--;
    }
  }
  return len;
}

function calcObjSize(obj) {
  let key;
  let size = 0;
  let type = typeof obj;

  if (!obj) {
    return 1;
  } else if (type === "number") {
    return 8;
  } else if (type === "string") {
    return encodedLength(obj) + 1;
  } else if (type === "boolean") {
    return 1;
  } else if (obj instanceof Date) {
    return 8;
  } else if (obj instanceof Array) {
    for (let i = 0; i < obj.length; i++) {
      size += calcObjSize(obj[i]);
    }
    return size;
  } else if (type === "object") {
    for (key of Object.keys(obj)) {
      size += encodedLength(key) + 1;
      size += calcObjSize(obj[key]);
    }
    return (size += 32);
  }
}
