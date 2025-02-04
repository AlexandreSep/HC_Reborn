/**
 * Functions to manage the Battalion selection UI
 */

let MAX_NUMBER_OF_ICONS = 120;
let g_gattalionUIElementsCached = false;
let g_battalionUIInitDone = false;

// List of all battalions
var g_battalionList = new Array();
var g_civiliansList = new Array();
var g_structuresCivilList = new Array();
var g_structuresMilitaryList = new Array();

let g_lastBattalionSelected = new Array();

// Cached percentage X-Values of military and civil area to allow toggle civil area
let g_battalionUIMilitaryAreaX = 0; 
let g_battalionUICivilAreaX = 0;

// Stores which UI elements are shown at the moment
let g_battaionUIDisplayingStructures = false;
let g_battalionUIMilitaryAreaExpanded = false;

// Constants for battalion type to avoid string conparisons (enum like)
let BATTALION_TYPE_UNIT_MILITARY = 0; 
let BATTALION_TYPE_UNIT_CIVIL = 1;
let BATTALION_TYPE_STRUCTURE_MILITARY = 2;
let BATTALION_TYPE_STRUCTURE_CIVIL = 3;

// Cached UI Elements

let g_mainUIContainer = new Object();

let g_battalionUiButtons = new Object();
g_battalionUiButtons.military = new Array();
g_battalionUiButtons.civil = new Array();
g_battalionUiButtons.structureMilitary = new Array();
g_battalionUiButtons.structureCivil = new Array();

let g_battalionUIIcons = new Object();
g_battalionUIIcons.military = new Array();
g_battalionUIIcons.civil = new Array();
g_battalionUIIcons.structureMilitary = new Array();
g_battalionUIIcons.structureCivil = new Array();

let g_battalionUnitCounterBackground = new Object();
g_battalionUnitCounterBackground.military = new Array();
g_battalionUnitCounterBackground.civil = new Array();
g_battalionUnitCounterBackground.structureMilitary = new Array();
g_battalionUnitCounterBackground.structureCivil = new Array();

let g_battalionSelectionHighlight = new Object();
g_battalionSelectionHighlight.military = new Array();
g_battalionSelectionHighlight.civil = new Array();
g_battalionSelectionHighlight.structureMilitary = new Array();
g_battalionSelectionHighlight.structureCivil = new Array();

let g_battalionUIUnitCount = new Object();
g_battalionUIUnitCount.military = new Array();
g_battalionUIUnitCount.civil = new Array();
g_battalionUIUnitCount.structureMilitary = new Array();
g_battalionUIUnitCount.structureCivil = new Array();
let g_battalionUIUnitCountSmall = new Object();
g_battalionUIUnitCountSmall.military = new Array();
g_battalionUIUnitCountSmall.civil = new Array();
g_battalionUIUnitCountSmall.structureMilitary = new Array();
g_battalionUIUnitCountSmall.structureCivil = new Array();

let g_battalionOrdersContainer = new Object();
g_battalionOrdersContainer.military = new Array();
g_battalionOrdersContainer.civil = new Array();
g_battalionOrdersContainer.structureMilitary = new Array();
g_battalionOrdersContainer.structureCivil = new Array();
let g_battalionOrdersIcon = new Object();
g_battalionOrdersIcon.military = new Array();
g_battalionOrdersIcon.civil = new Array();
g_battalionOrdersIcon.structureMilitary = new Array();
g_battalionOrdersIcon.structureCivil = new Array();

let g_battalionUiLifeBarContainer = new Object();
g_battalionUiLifeBarContainer.military = new Array();
g_battalionUiLifeBarContainer.civil = new Array();
g_battalionUiLifeBarContainer.structureMilitary = new Array();
g_battalionUiLifeBarContainer.structureCivil = new Array();
let g_battalionUiLifeBars = new Object();
g_battalionUiLifeBars.military = new Array();
g_battalionUiLifeBars.civil = new Array();
g_battalionUiLifeBars.structureMilitary = new Array();
g_battalionUiLifeBars.structureCivil = new Array();

let g_battalionUIGroupBorders = new Object();
g_battalionUIGroupBorders.military = new Object();
g_battalionUIGroupBorders.military.top = new Array();
g_battalionUIGroupBorders.military.bottom = new Array();
g_battalionUIGroupBorders.military.left = new Array();
g_battalionUIGroupBorders.military.right = new Array();
g_battalionUIGroupBorders.structureMilitary = new Object();
g_battalionUIGroupBorders.structureMilitary.top = new Array();
g_battalionUIGroupBorders.structureMilitary.bottom = new Array();
g_battalionUIGroupBorders.structureMilitary.left = new Array();
g_battalionUIGroupBorders.structureMilitary.right = new Array();
g_battalionUIGroupBorders.civil = new Object();
g_battalionUIGroupBorders.civil.top = new Array();
g_battalionUIGroupBorders.civil.bottom = new Array();
g_battalionUIGroupBorders.civil.left = new Array();
g_battalionUIGroupBorders.civil.right = new Array();
g_battalionUIGroupBorders.structureCivil = new Object();
g_battalionUIGroupBorders.structureCivil.top = new Array();
g_battalionUIGroupBorders.structureCivil.bottom = new Array();
g_battalionUIGroupBorders.structureCivil.left = new Array();
g_battalionUIGroupBorders.structureCivil.right = new Array();

let g_battalionUIGroupSelectionButtons = new Object();
g_battalionUIGroupSelectionButtons.military = new Array();
g_battalionUIGroupSelectionButtons.civil = new Array();
g_battalionUIGroupSelectionButtons.structureMilitary = new Array();
g_battalionUIGroupSelectionButtons.structureCivil = new Array();
let g_battalionUIGroupSelectionButtonsGroupNumber = new Object();
g_battalionUIGroupSelectionButtonsGroupNumber.military = new Array();
g_battalionUIGroupSelectionButtonsGroupNumber.civil = new Array();
g_battalionUIGroupSelectionButtonsGroupNumber.structureMilitary = new Array();
g_battalionUIGroupSelectionButtonsGroupNumber.structureCivil = new Array();
let g_battalionUIGroupSelectionButtonsGroupNumberSmall = new Object();
g_battalionUIGroupSelectionButtonsGroupNumberSmall.military = new Array();
g_battalionUIGroupSelectionButtonsGroupNumberSmall.civil = new Array();
g_battalionUIGroupSelectionButtonsGroupNumberSmall.structureMilitary = new Array();
g_battalionUIGroupSelectionButtonsGroupNumberSmall.structureCivil = new Array();

let g_civilBattalionArea = Engine.GetGUIObjectByName("civilBattalionArea");

/**
 * Initializing all global data structures
 */
// Values for the group borders at scaling level 0
let g_borderBaseValues = new Object(); // Base values for group borders
 
// Set scaling values for unit icons.
// Must be done here, as the init function is called too late
let g_iconScalingValues = new Object(); 
g_iconScalingValues.military = new Array();
g_iconScalingValues.military.push({"NumberOfCols": 10, "ColWidth": 10, "RowHeight": 50, "ColMargin": 1, "RowMargin": 5});
g_iconScalingValues.military.push({"NumberOfCols": 12, "ColWidth":  8.2, "RowHeight": 33, "ColMargin": 1, "RowMargin": 1});
g_iconScalingValues.military.push({"NumberOfCols": 15, "ColWidth":  6.6, "RowHeight": 25, "ColMargin": 1, "RowMargin": 1});
g_iconScalingValues.military.push({"NumberOfCols": 20, "ColWidth":  5, "RowHeight": 20, "ColMargin": 1, "RowMargin": 1});

g_iconScalingValues.militaryExpandedLeft = new Array();
g_iconScalingValues.militaryExpandedLeft.push({"NumberOfCols": 13, "ColWidth": 7.6, "RowHeight": 50, "ColMargin": 0.75, "RowMargin": 5});
g_iconScalingValues.militaryExpandedLeft.push({"NumberOfCols": 16, "ColWidth": 6.2, "RowHeight": 33, "ColMargin": 0.8, "RowMargin": 1});
g_iconScalingValues.militaryExpandedLeft.push({"NumberOfCols": 19, "ColWidth": 5.2, "RowHeight": 25, "ColMargin": 0.8, "RowMargin": 1});
g_iconScalingValues.militaryExpandedLeft.push({"NumberOfCols": 24, "ColWidth": 4.1, "RowHeight": 20, "ColMargin": 0.8, "RowMargin": 1});

g_iconScalingValues.civil = new Array();
g_iconScalingValues.civil.push({"NumberOfCols":  5, "ColWidth": 20, "RowHeight": 33, "ColMargin": 1, "RowMargin": 1});
g_iconScalingValues.civil.push({"NumberOfCols":  7, "ColWidth": 14.2, "RowHeight": 25, "ColMargin": 1, "RowMargin": 1});
g_iconScalingValues.civil.push({"NumberOfCols":  8, "ColWidth": 12, "RowHeight": 20, "ColMargin": 1, "RowMargin": 1});
g_iconScalingValues.civil.push({"NumberOfCols": 10, "ColWidth": 10, "RowHeight": 16, "ColMargin": 1, "RowMargin": 1});

// Set the dimensions of the unit counter background
// Must be done here, as the init function is caled too late
let g_unitCounterBackgroundDimensions = new Object();
g_unitCounterBackgroundDimensions.military = new Array();
g_unitCounterBackgroundDimensions.military.push ({"rleft": 0, "rtop": 70, "rright": 35, "rbottom": 100});
g_unitCounterBackgroundDimensions.military.push ({"rleft": 0, "rtop": 65, "rright": 45, "rbottom": 100});
g_unitCounterBackgroundDimensions.military.push ({"rleft": 0, "rtop": 60, "rright": 45, "rbottom": 100});
g_unitCounterBackgroundDimensions.military.push ({"rleft": 0, "rtop": 50, "rright": 60, "rbottom": 100});

g_unitCounterBackgroundDimensions.civil = new Array();
g_unitCounterBackgroundDimensions.civil.push ({"rleft": 0, "rtop": 60, "rright": 35, "rbottom": 100});
g_unitCounterBackgroundDimensions.civil.push ({"rleft": 0, "rtop": 60, "rright": 35, "rbottom": 100});
g_unitCounterBackgroundDimensions.civil.push ({"rleft": 0, "rtop": 45, "rright": 45, "rbottom": 100});
g_unitCounterBackgroundDimensions.civil.push ({"rleft": 0, "rtop": 45, "rright": 45, "rbottom": 100});

// Set the dimensions of the group selection button. Left and top use the group border values, as those numbers shall match
// Must be done here, as the init function is caled too late
let g_groupNumberButtonSize = new Object();
g_groupNumberButtonSize.military = new Array();
g_groupNumberButtonSize.military.push ({"rright": 30, "rbottom": 30});
g_groupNumberButtonSize.military.push ({"rright": 30, "rbottom": 35});
g_groupNumberButtonSize.military.push ({"rright": 35, "rbottom": 35});
g_groupNumberButtonSize.military.push ({"rright": 40, "rbottom": 40});

g_groupNumberButtonSize.civil = new Array();
g_groupNumberButtonSize.civil.push ({"rright": 35, "rbottom": 35});
g_groupNumberButtonSize.civil.push ({"rright": 40, "rbottom": 40});
g_groupNumberButtonSize.civil.push ({"rright": 45, "rbottom": 45});
g_groupNumberButtonSize.civil.push ({"rright": 50, "rbottom": 50});

function InitBattalionUi ()
{
    for (let i = 0; i < g_Players.length; i++){
        g_lastBattalionSelected[i] = new Map();
        g_lastBattalionSelected[i].set(BATTALION_TYPE_UNIT_MILITARY, 0);
        g_lastBattalionSelected[i].set(BATTALION_TYPE_UNIT_CIVIL, 0);
        g_lastBattalionSelected[i].set(BATTALION_TYPE_STRUCTURE_MILITARY, 0);
        g_lastBattalionSelected[i].set(BATTALION_TYPE_STRUCTURE_CIVIL, 0);

        g_battalionList[i] = new Array();
        g_civiliansList[i] = new Array();
        g_structuresMilitaryList[i] = new Array();
        g_structuresCivilList[i] = new Array();
    }
    
    g_mainUIContainer.military = Engine.GetGUIObjectByName("militaryBattalions");
    g_mainUIContainer.civil = Engine.GetGUIObjectByName("civilBattalions");
    g_mainUIContainer.structureMilitary = Engine.GetGUIObjectByName("militaryStructureBattalions");
    g_mainUIContainer.structureCivil = Engine.GetGUIObjectByName("civilStructureBattalions");
    
    // Initializing MAX_NUMBER_OF_ICONS icons.
    for (let i = 0; i < MAX_NUMBER_OF_ICONS; i++){
        //Military
        let groupBoxLineTop = Engine.GetGUIObjectByName("groupBoxLineTop[" + i + "]");
        groupBoxLineTop.sprite = "stretched:battalionUI_group_border.png";
        let groupBoxLineBottom = Engine.GetGUIObjectByName("groupBoxLineBottom[" + i + "]");
        groupBoxLineBottom.sprite = "stretched:battalionUI_group_border.png";
        let groupBoxLineLeft = Engine.GetGUIObjectByName("groupBoxLineLeft[" + i + "]");
        groupBoxLineLeft.sprite = "stretched:battalionUI_group_border.png";
        let groupBoxLineRight = Engine.GetGUIObjectByName("groupBoxLineRight[" + i + "]");
        groupBoxLineRight.sprite = "stretched:battalionUI_group_border.png";
        let battalionSelectionHighlight = Engine.GetGUIObjectByName("battalionSelectionHighlight[" + i + "]");
        battalionSelectionHighlight.sprite = "stretched:battalionUI_selection_highlight.png";
        let buttonUnitCountBackground = Engine.GetGUIObjectByName("battalionSelectionCountBackground[" + i + "]");
        buttonUnitCountBackground.sprite = "stretched:null_black.dds";

        g_battalionUiLifeBars.military[i].sprite = "stretched:battalionUI_icon_lifebar_green.png";
        g_battalionUIGroupSelectionButtons.military[i].sprite = "stretched:battalionUI_group_border.png"; 
        
        //Civil
        groupBoxLineTop = Engine.GetGUIObjectByName("civilGroupBoxLineTop[" + i + "]");
        groupBoxLineTop.sprite = "stretched:battalionUI_group_border.png";
        groupBoxLineBottom = Engine.GetGUIObjectByName("civilGroupBoxLineBottom[" + i + "]");
        groupBoxLineBottom.sprite = "stretched:battalionUI_group_border.png";
        groupBoxLineLeft = Engine.GetGUIObjectByName("civilGroupBoxLineLeft[" + i + "]");
        groupBoxLineLeft.sprite = "stretched:battalionUI_group_border.png";
        groupBoxLineRight = Engine.GetGUIObjectByName("civilGroupBoxLineRight[" + i + "]");
        groupBoxLineRight.sprite = "stretched:battalionUI_group_border.png";
        battalionSelectionHighlight = Engine.GetGUIObjectByName("civilBattalionSelectionHighlight[" + i + "]");
        battalionSelectionHighlight.sprite = "stretched:battalionUI_selection_highlight.png";
        buttonUnitCountBackground = Engine.GetGUIObjectByName("civilBattalionSelectionCountBackground[" + i + "]");
        buttonUnitCountBackground.sprite = "stretched:null_black.dds";
        
        g_battalionUiLifeBars.civil[i].sprite = "stretched:battalionUI_icon_lifebar_green.png";
        g_battalionUIGroupSelectionButtons.civil[i].sprite = "stretched:battalionUI_group_border.png"; 
        
        //Structure Military
        groupBoxLineTop = Engine.GetGUIObjectByName("structureGroupBoxLineTop[" + i + "]");
        groupBoxLineTop.sprite = "stretched:battalionUI_group_border.png";
        groupBoxLineBottom = Engine.GetGUIObjectByName("structureGroupBoxLineBottom[" + i + "]");
        groupBoxLineBottom.sprite = "stretched:battalionUI_group_border.png";
        groupBoxLineLeft = Engine.GetGUIObjectByName("structureGroupBoxLineLeft[" + i + "]");
        groupBoxLineLeft.sprite = "stretched:battalionUI_group_border.png";
        groupBoxLineRight = Engine.GetGUIObjectByName("structureGroupBoxLineRight[" + i + "]");
        groupBoxLineRight.sprite = "stretched:battalionUI_group_border.png";
        battalionSelectionHighlight = Engine.GetGUIObjectByName("structureSelectionHighlight[" + i + "]");
        battalionSelectionHighlight.sprite = "stretched:battalionUI_selection_highlight.png";
        buttonUnitCountBackground = Engine.GetGUIObjectByName("structureSelectionCountBackground[" + i + "]");
        buttonUnitCountBackground.sprite = "stretched:null_black.dds";
        
        g_battalionUiLifeBars.structureMilitary[i].sprite = "stretched:battalionUI_icon_lifebar_green.png";
        g_battalionUIGroupSelectionButtons.structureMilitary[i].sprite = "stretched:battalionUI_group_border.png"; 
        
        //Structure Civil
        groupBoxLineTop = Engine.GetGUIObjectByName("civilStructureGroupBoxLineTop[" + i + "]");
        groupBoxLineTop.sprite = "stretched:battalionUI_group_border.png";
        groupBoxLineBottom = Engine.GetGUIObjectByName("civilStructureGroupBoxLineBottom[" + i + "]");
        groupBoxLineBottom.sprite = "stretched:battalionUI_group_border.png";
        groupBoxLineLeft = Engine.GetGUIObjectByName("civilStructureGroupBoxLineLeft[" + i + "]");
        groupBoxLineLeft.sprite = "stretched:battalionUI_group_border.png";
        groupBoxLineRight = Engine.GetGUIObjectByName("civilStructureGroupBoxLineRight[" + i + "]");
        groupBoxLineRight.sprite = "stretched:battalionUI_group_border.png";
        battalionSelectionHighlight = Engine.GetGUIObjectByName("civilStructureSelectionHighlight[" + i + "]");
        battalionSelectionHighlight.sprite = "stretched:battalionUI_selection_highlight.png";
        buttonUnitCountBackground = Engine.GetGUIObjectByName("civilStructureSelectionCountBackground[" + i + "]");
        buttonUnitCountBackground.sprite = "stretched:null_black.dds";
        
        g_battalionUiLifeBars.structureCivil[i].sprite = "stretched:battalionUI_icon_lifebar_green.png";
        g_battalionUIGroupSelectionButtons.structureCivil[i].sprite = "stretched:battalionUI_group_border.png"; 
    }
        
    // Set base values for scale level 0 of group borders
    g_borderBaseValues.top = {"left": -5.2, "top": -5.2, "right": 105.2, "bottom": 0.2};
    g_borderBaseValues.bottom = {"left": -5.2, "top": 100.2, "right": 105.2, "bottom": 105.2};
    g_borderBaseValues.left = {"left": -5.2, "top": -5.2, "right": 0.2, "bottom": 105.2};
    g_borderBaseValues.right = {"left": 100.2, "top": -5.2, "right": 105.2, "bottom": 105.2};
    
    // Read X-values of military and civil area
    g_battalionUIMilitaryAreaX = Engine.GetGUIObjectByName("militaryBattalionArea").size.rleft;
    g_battalionUICivilAreaX = Engine.GetGUIObjectByName("civilBattalionArea").size.rleft;

    SetUIBackgroundTexture();
}

function CacheBattalionUIElements ()
{
    for (let i = 0; i < MAX_NUMBER_OF_ICONS; i++){
        g_battalionUiButtons.military[i] = Engine.GetGUIObjectByName("battalionSelectionButton[" + i + "]")
        g_battalionUiButtons.civil[i] = Engine.GetGUIObjectByName("civilBattalionSelectionButton[" + i + "]")
        g_battalionUiButtons.structureMilitary[i] = Engine.GetGUIObjectByName("structureSelectionButton[" + i + "]")
        g_battalionUiButtons.structureCivil[i] = Engine.GetGUIObjectByName("civilStructureSelectionButton[" + i + "]")
        
        g_battalionUIIcons.military[i] = Engine.GetGUIObjectByName("battalionSelectionIcon[" + i + "]");
        g_battalionUIIcons.civil[i] = Engine.GetGUIObjectByName("civilBattalionSelectionIcon[" + i + "]");
        g_battalionUIIcons.structureMilitary[i] = Engine.GetGUIObjectByName("structureSelectionIcon[" + i + "]");
        g_battalionUIIcons.structureCivil[i] = Engine.GetGUIObjectByName("civilStructureSelectionIcon[" + i + "]");
        
        g_battalionUnitCounterBackground.military[i] = Engine.GetGUIObjectByName("battalionSelectionCountBackground[" + i + "]");
        g_battalionUnitCounterBackground.civil[i] = Engine.GetGUIObjectByName("civilBattalionSelectionCountBackground[" + i + "]");
        g_battalionUnitCounterBackground.structureMilitary[i] = Engine.GetGUIObjectByName("structureSelectionCountBackground[" + i + "]");
        g_battalionUnitCounterBackground.structureCivil[i] = Engine.GetGUIObjectByName("civilStructureSelectionCountBackground[" + i + "]");
        
        g_battalionOrdersContainer.military[i] = Engine.GetGUIObjectByName("battalionOrdersContainer[" + i + "]");
        g_battalionOrdersContainer.civil[i] = Engine.GetGUIObjectByName("civilBattalionOrdersContainer[" + i + "]");
        g_battalionOrdersContainer.structureMilitary[i] = Engine.GetGUIObjectByName("militaryStructureOrdersContainer[" + i + "]");
        g_battalionOrdersContainer.structureCivil[i] = Engine.GetGUIObjectByName("civilStructureOrdersContainer[" + i + "]");
        g_battalionOrdersIcon.military[i] = Engine.GetGUIObjectByName("battalionOrdersIcon[" + i + "]");
        g_battalionOrdersIcon.civil[i] = Engine.GetGUIObjectByName("civilBattalionOrdersIcon[" + i + "]");
        g_battalionOrdersIcon.structureMilitary[i] = Engine.GetGUIObjectByName("militaryStructureOrdersIcon[" + i + "]");
        g_battalionOrdersIcon.structureCivil[i] = Engine.GetGUIObjectByName("civilStructureOrdersIcon[" + i + "]");
        
        g_battalionSelectionHighlight.military[i] = Engine.GetGUIObjectByName("battalionSelectionHighlight[" + i + "]");
        g_battalionSelectionHighlight.civil[i] = Engine.GetGUIObjectByName("civilBattalionSelectionHighlight[" + i + "]");
        g_battalionSelectionHighlight.structureMilitary[i] = Engine.GetGUIObjectByName("structureSelectionHighlight[" + i + "]");
        g_battalionSelectionHighlight.structureCivil[i] = Engine.GetGUIObjectByName("civilStructureSelectionHighlight[" + i + "]");
        
        g_battalionUIUnitCount.military[i] = Engine.GetGUIObjectByName("battalionSelectionCount[" + i + "]");
        g_battalionUIUnitCount.civil[i] = Engine.GetGUIObjectByName("civilBattalionSelectionCount[" + i + "]");
        g_battalionUIUnitCountSmall.military[i] = Engine.GetGUIObjectByName("battalionSelectionCountSmall[" + i + "]");
        g_battalionUIUnitCountSmall.civil[i] = Engine.GetGUIObjectByName("civilBattalionSelectionCountSmall[" + i + "]");
        g_battalionUIUnitCount.structureMilitary[i] = Engine.GetGUIObjectByName("structureSelectionCount[" + i + "]");
        g_battalionUIUnitCount.structureCivil[i] = Engine.GetGUIObjectByName("civilStructureSelectionCount[" + i + "]");
        g_battalionUIUnitCountSmall.structureMilitary[i] = Engine.GetGUIObjectByName("structureSelectionCountSmall[" + i + "]");
        g_battalionUIUnitCountSmall.structureCivil[i] = Engine.GetGUIObjectByName("civilStructureSelectionCountSmall[" + i + "]");
        
        g_battalionUiLifeBarContainer.military[i] = Engine.GetGUIObjectByName("battalionSelectionUnitLifebarContainer[" + i + "]");
        g_battalionUiLifeBarContainer.civil[i] = Engine.GetGUIObjectByName("civilBattalionSelectionUnitLifebarContainer[" + i + "]");
        g_battalionUiLifeBars.military[i] = Engine.GetGUIObjectByName("battalionSelectionUnitLifebar[" + i + "]");
        g_battalionUiLifeBars.civil[i] = Engine.GetGUIObjectByName("civilBattalionSelectionUnitLifebar[" + i + "]");
        g_battalionUiLifeBarContainer.structureMilitary[i] = Engine.GetGUIObjectByName("structureSelectionUnitLifebarContainer[" + i + "]");
        g_battalionUiLifeBarContainer.structureCivil[i] = Engine.GetGUIObjectByName("civilStructureSelectionUnitLifebarContainer[" + i + "]");
        g_battalionUiLifeBars.structureMilitary[i] = Engine.GetGUIObjectByName("structureSelectionUnitLifebar[" + i + "]");
        g_battalionUiLifeBars.structureCivil[i] = Engine.GetGUIObjectByName("civilStructureSelectionUnitLifebar[" + i + "]");
        
        g_battalionUIGroupBorders.military.top[i] = Engine.GetGUIObjectByName("groupBoxLineTop[" + i + "]");
        g_battalionUIGroupBorders.military.bottom[i] = Engine.GetGUIObjectByName("groupBoxLineBottom[" + i + "]");
        g_battalionUIGroupBorders.military.left[i] = Engine.GetGUIObjectByName("groupBoxLineLeft[" + i + "]");
        g_battalionUIGroupBorders.military.right[i] = Engine.GetGUIObjectByName("groupBoxLineRight[" + i + "]");
        g_battalionUIGroupBorders.civil.top[i] = Engine.GetGUIObjectByName("civilGroupBoxLineTop[" + i + "]");
        g_battalionUIGroupBorders.civil.bottom[i] = Engine.GetGUIObjectByName("civilGroupBoxLineBottom[" + i + "]");
        g_battalionUIGroupBorders.civil.left[i] = Engine.GetGUIObjectByName("civilGroupBoxLineLeft[" + i + "]");
        g_battalionUIGroupBorders.civil.right[i] = Engine.GetGUIObjectByName("civilGroupBoxLineRight[" + i + "]");
        g_battalionUIGroupBorders.structureMilitary.top[i] = Engine.GetGUIObjectByName("structureGroupBoxLineTop[" + i + "]");
        g_battalionUIGroupBorders.structureMilitary.bottom[i] = Engine.GetGUIObjectByName("structureGroupBoxLineBottom[" + i + "]");
        g_battalionUIGroupBorders.structureMilitary.left[i] = Engine.GetGUIObjectByName("structureGroupBoxLineLeft[" + i + "]");
        g_battalionUIGroupBorders.structureMilitary.right[i] = Engine.GetGUIObjectByName("structureGroupBoxLineRight[" + i + "]");
        g_battalionUIGroupBorders.structureCivil.top[i] = Engine.GetGUIObjectByName("civilStructureGroupBoxLineTop[" + i + "]");
        g_battalionUIGroupBorders.structureCivil.bottom[i] = Engine.GetGUIObjectByName("civilStructureGroupBoxLineBottom[" + i + "]");
        g_battalionUIGroupBorders.structureCivil.left[i] = Engine.GetGUIObjectByName("civilStructureGroupBoxLineLeft[" + i + "]");
        g_battalionUIGroupBorders.structureCivil.right[i] = Engine.GetGUIObjectByName("civilStructureGroupBoxLineRight[" + i + "]");
        
        g_battalionUIGroupSelectionButtons.military[i] = Engine.GetGUIObjectByName("battalionGroupSelectionButton[" + i + "]");
        g_battalionUIGroupSelectionButtons.civil[i] = Engine.GetGUIObjectByName("civilBattalionGroupSelectionButton[" + i + "]");
        g_battalionUIGroupSelectionButtonsGroupNumber.military[i] = Engine.GetGUIObjectByName("battalionGroupSelectionButtonGroupNumber[" + i + "]");
        g_battalionUIGroupSelectionButtonsGroupNumber.civil[i] = Engine.GetGUIObjectByName("civilBattalionGroupSelectionButtonGroupNumber[" + i + "]");
        g_battalionUIGroupSelectionButtonsGroupNumberSmall.military[i] = Engine.GetGUIObjectByName("battalionGroupSelectionButtonGroupNumberSmall[" + i + "]");
        g_battalionUIGroupSelectionButtonsGroupNumberSmall.civil[i] = Engine.GetGUIObjectByName("civilBattalionGroupSelectionButtonGroupNumberSmall[" + i + "]");
        g_battalionUIGroupSelectionButtons.structureMilitary[i] = Engine.GetGUIObjectByName("structureGroupSelectionButton[" + i + "]");
        g_battalionUIGroupSelectionButtons.structureCivil[i] = Engine.GetGUIObjectByName("civilStructureGroupSelectionButton[" + i + "]");
        g_battalionUIGroupSelectionButtonsGroupNumber.structureMilitary[i] = Engine.GetGUIObjectByName("structureGroupSelectionButtonGroupNumber[" + i + "]");
        g_battalionUIGroupSelectionButtonsGroupNumber.structureCivil[i] = Engine.GetGUIObjectByName("civilStructureGroupSelectionButtonGroupNumber[" + i + "]");
        g_battalionUIGroupSelectionButtonsGroupNumberSmall.structureMilitary[i] = Engine.GetGUIObjectByName("structureGroupSelectionButtonGroupNumberSmall[" + i + "]");
        g_battalionUIGroupSelectionButtonsGroupNumberSmall.structureCivil[i] = Engine.GetGUIObjectByName("civilStructureGroupSelectionButtonGroupNumberSmall[" + i + "]");
    }
}

/**
 * Functions containing all the logic
 */

function UpdateBattalionList (battalionsToAdd, battalionsToUpdate, battalionsToDelete, battalionOrders)
{
    let thisPlayer = Engine.GetPlayerID();
    
    // Must be done here, as the timing must be right
    if(!g_gattalionUIElementsCached)
    {
        CacheBattalionUIElements();
        g_gattalionUIElementsCached = true;
    }
    if(!g_battalionUIInitDone)
    {
        InitBattalionUi();
        g_battalionUIInitDone = true;
    }
    
    UpdateBattalions (battalionsToUpdate); // Must be done before deleting battalions. A battalon can be in "update" and "delete" is multiple entities are deleted at the same time
    
    DeleteBattalions (battalionsToDelete);
    
    AddBattalions (battalionsToAdd);
    
    UpdateAllBattalionOrders (battalionOrders);
    
    RefreshBattalionUI(thisPlayer);
}

function AddBattalions (battalionsToAdd)
{
    for (let player of battalionsToAdd){
        let playerID = player[0];
        let battalionsToAddForPlayer = player[1];

        // Do nothing if spectator
        if (playerID == -1){
            continue;
        }

        // Put the battalion into the apropriate list
        for(let battalion of battalionsToAddForPlayer){
            let entityState = GetEntityState(battalion.entities[0]);
            if (!entityState){
                continue;
            }
            battalion.template = entityState.template;
            battalion.selected = false;
            battalion.groupID = 100;

            // Old ordering Separating buildings and units, military and civilians
            if (battalion.isStructure && !battalion.isCivilian){
                AddBattalionToList (battalion, playerID, g_structuresMilitaryList[playerID]);
            }else if (battalion.isStructure && battalion.isCivilian){
                AddBattalionToList (battalion, playerID, g_structuresCivilList[playerID]);
            }else if(battalion.isCivilian){
                AddBattalionToList (battalion, playerID, g_civiliansList[playerID]);
            }else{
                AddBattalionToList (battalion, playerID, g_battalionList[playerID]);
            }

            // if (battalion.isStructure && battalion.isCenterNode){
            //     AddBattalionToList (battalion, playerID, g_structuresCivilList[playerID]);
            // }else if (battalion.isStructure && !battalion.isCenterNode && battalion.trainsUnits){
            //     AddBattalionToList (battalion, playerID, g_structuresMilitaryList[playerID]);
            // }else if(battalion.isStructure){
            //     AddBattalionToList (battalion, playerID, g_civiliansList[playerID]);
            // }else{
            //     AddBattalionToList (battalion, playerID, g_battalionList[playerID]);
            // }
        }
    }
}

function AddBattalionToList (battalion, playerID, battalionList, groupID = 100)
{
    if(battalionList == undefined) {
        warn("battalionList undefined for " + battalion.template);
        return;
    }

    // This check is needed to not add units twice if they are already in the List
    // That can happen if a unit gets promoted while spawning from base (Hylians for example)
    // In that case a battalion is in both lists: Add and Update list and update is processed before addind
    if (-1 != GetIndexFromBattalionID (battalionList, battalion.battalionID)){
        return;
    }
    
    let IndexToInsertAfter = GetLastOccurenceOfTemplate(playerID, battalion.template, battalionList, groupID);
    if (IndexToInsertAfter < 0){
        battalionList.push(battalion);
    } else {
        battalionList.splice((IndexToInsertAfter+1), 0, battalion);
    }
}

function GetLastOccurenceOfTemplate (playerID, templateToFind, battalionList, groupID = 100)
{
    if(!battalionList){
        return -1;
    }
    
    for (let i = battalionList.length -1; i >= 0; i--){
        let battalionData = battalionList[i];
        // Put after the last occurence of that unit type. A group can be specified. 100 means "no Group"
        if (battalionData && battalionData.template == templateToFind && battalionData.groupID == groupID){
            return i;
        }
    }
    return -1;
}

function RefreshBattalionUI (playerID)
{
    if (playerID <= 0){
        return;
    }
    let playerBattalionList = g_battalionList[playerID];
    
    // Determine how long all the lists are
    let numberOfMilitaryUnitBattalionIcons = g_battalionList[playerID].length; // The UI can only hold a fixed amount of icons. We must make sure to not access elements that do not exist
    if (numberOfMilitaryUnitBattalionIcons > MAX_NUMBER_OF_ICONS){
        numberOfMilitaryUnitBattalionIcons = MAX_NUMBER_OF_ICONS;
    }
    let numberOfCivilUnitBattalionIcons = g_civiliansList[playerID].length; // The UI can only hold a fixed amount of icons. We must make sure to not access elements that do not exist
    if (numberOfCivilUnitBattalionIcons > MAX_NUMBER_OF_ICONS){
        numberOfCivilUnitBattalionIcons = MAX_NUMBER_OF_ICONS;
    }
    let numberOfMilitaryStructureBattalionIcons = g_structuresMilitaryList[playerID].length; // The UI can only hold a fixed amount of icons. We must make sure to not access elements that do not exist
    if (numberOfMilitaryStructureBattalionIcons > MAX_NUMBER_OF_ICONS){
        numberOfMilitaryStructureBattalionIcons = MAX_NUMBER_OF_ICONS;
    }
    let numberOfCivilStructureBattalionIcons = g_structuresCivilList[playerID].length; // The UI can only hold a fixed amount of icons. We must make sure to not access elements that do not exist
    if (numberOfCivilStructureBattalionIcons > MAX_NUMBER_OF_ICONS){
        numberOfCivilStructureBattalionIcons = MAX_NUMBER_OF_ICONS;
    }
    
    // Set buttons to invisible that shall not be visible (because the list got shorter)
    for (let i = g_battalionList[playerID].length; i < MAX_NUMBER_OF_ICONS; i++){
        g_battalionUiButtons.military[i].hidden = true;
        if (g_battalionUiButtons.military[i].hidden == false){
            g_battalionUiButtons.military[i].hidden = true;
        }
    }
    for (let i = g_civiliansList[playerID].length; i < MAX_NUMBER_OF_ICONS; i++){
        if (g_battalionUiButtons.civil[i].hidden == false){
            g_battalionUiButtons.civil[i].hidden = true;
        }
    }
    for (let i = g_structuresMilitaryList[playerID].length; i < MAX_NUMBER_OF_ICONS; i++){
        g_battalionUiButtons.structureMilitary[i].hidden = true;
        if (g_battalionUiButtons.structureMilitary[i].hidden == false){
            g_battalionUiButtons.structureMilitary[i].hidden = true;
        }
    }
    for (let i = g_structuresCivilList[playerID].length; i < MAX_NUMBER_OF_ICONS; i++){
        g_battalionUiButtons.structureCivil[i].hidden = true;
        if (g_battalionUiButtons.structureCivil[i].hidden == false){
            g_battalionUiButtons.structureCivil[i].hidden = true;
        }
    }
    
    let scalingLevelMilitary = 0;
    let scalingLevelCivil = 0;
    let scalingLevelStructureMilitary = 0;
    let scalingLevelStructureCivil = 0;
    
    // Refresh Military Units
    if (!g_battaionUIDisplayingStructures){
    
        for (let i = 0; i < numberOfMilitaryUnitBattalionIcons; ++i){

            // The number of buttons must be hard set by the UI xml. Stop when we reach that limit
            if (i >= MAX_NUMBER_OF_ICONS){
                continue;
            }
            
            let button = g_battalionUiButtons.military[i];
            let buttonIcon = g_battalionUIIcons.military[i];
            
            SetButtonIcon (buttonIcon, playerID, i, g_battalionList[playerID], g_battalionSelectionHighlight.military[i]);
            scalingLevelMilitary = DefineButtonPosition(button, playerID, i, BATTALION_TYPE_UNIT_MILITARY);
            SetUnitCountDisplay (scalingLevelMilitary, playerID, i, BATTALION_TYPE_UNIT_MILITARY);
            SetUnitCounterBackground (playerID, scalingLevelMilitary, i, BATTALION_TYPE_UNIT_MILITARY);
            SetLifeBar (playerID, scalingLevelMilitary, i, BATTALION_TYPE_UNIT_MILITARY);
            DefineButtonActions (button, playerID, i, BATTALION_TYPE_UNIT_MILITARY);
            SetGroupSelectionButton (playerID, scalingLevelMilitary, i, BATTALION_TYPE_UNIT_MILITARY);
            
            if (button.hidden){
                button.hidden = false;
            }
        }
        
        // Refresh Civilian units
        for (let i = 0; i< g_civiliansList[playerID].length; ++i){

            // The number of buttons must be hard set by the UI xml. Stop when we reach that limit
            if (i >= MAX_NUMBER_OF_ICONS){
                continue;
            }
            
            let button = g_battalionUiButtons.civil[i];
            let buttonIcon = g_battalionUIIcons.civil[i];
            
            SetButtonIcon (buttonIcon, playerID, i, g_civiliansList[playerID], g_battalionSelectionHighlight.civil[i]);
            scalingLevelCivil = DefineButtonPosition(button, playerID, i, BATTALION_TYPE_UNIT_CIVIL);
            SetUnitCountDisplay (scalingLevelCivil, playerID, i, BATTALION_TYPE_UNIT_CIVIL);
            SetUnitCounterBackground (playerID, scalingLevelCivil, i, BATTALION_TYPE_UNIT_CIVIL);
            SetLifeBar (playerID, scalingLevelCivil, i, BATTALION_TYPE_UNIT_CIVIL);
            DefineButtonActions (button, playerID, i, BATTALION_TYPE_UNIT_CIVIL);
            SetGroupSelectionButton (playerID, scalingLevelCivil, i, BATTALION_TYPE_UNIT_CIVIL);
            
            if (button.hidden){
                button.hidden = false;
            }
        }
        
        MarkGroupBordersVisually(playerID, scalingLevelMilitary, BATTALION_TYPE_UNIT_MILITARY);
        MarkGroupBordersVisually(playerID, scalingLevelCivil, BATTALION_TYPE_UNIT_CIVIL);
    } else {
    
        // Refresh Military Structures
        for (let i = 0; i< g_structuresMilitaryList[playerID].length; ++i){

            // The number of buttons must be hard set by the UI xml. Stop when we reach that limit
            if (i >= MAX_NUMBER_OF_ICONS){
                continue;
            }
            
            let button = g_battalionUiButtons.structureMilitary[i];
            let buttonIcon = g_battalionUIIcons.structureMilitary[i];
            
            SetButtonIcon (buttonIcon, playerID, i, g_structuresMilitaryList[playerID], g_battalionSelectionHighlight.structureMilitary[i]);
            scalingLevelStructureMilitary = DefineButtonPosition(button, playerID, i, BATTALION_TYPE_STRUCTURE_MILITARY);
            SetUnitCountDisplay (scalingLevelStructureMilitary, playerID, i, BATTALION_TYPE_STRUCTURE_MILITARY);
            SetUnitCounterBackground (playerID, scalingLevelStructureMilitary, i, BATTALION_TYPE_STRUCTURE_MILITARY);
            SetLifeBar (playerID, scalingLevelStructureMilitary, i, BATTALION_TYPE_STRUCTURE_MILITARY);
            DefineButtonActions (button, playerID, i, BATTALION_TYPE_STRUCTURE_MILITARY);
            SetGroupSelectionButton (playerID, scalingLevelStructureMilitary, i, BATTALION_TYPE_STRUCTURE_MILITARY);
            
            if (button.hidden){
                button.hidden = false;
            }
        }
        
        // Refresh Civilian Structures
        for (let i = 0; i< g_structuresCivilList[playerID].length; ++i){

            // The number of buttons must be hard set by the UI xml. Stop when we reach that limit
            if (i >= MAX_NUMBER_OF_ICONS){
                continue;
            }
            
            let button = g_battalionUiButtons.structureCivil[i];
            let buttonIcon = g_battalionUIIcons.structureCivil[i];
            
            SetButtonIcon (buttonIcon, playerID, i, g_structuresCivilList[playerID], g_battalionSelectionHighlight.structureCivil[i]);
            scalingLevelStructureCivil = DefineButtonPosition(button, playerID, i, BATTALION_TYPE_STRUCTURE_CIVIL);
            SetUnitCountDisplay (scalingLevelStructureCivil, playerID, i, BATTALION_TYPE_STRUCTURE_CIVIL);
            SetUnitCounterBackground (playerID, scalingLevelStructureCivil, i, BATTALION_TYPE_STRUCTURE_CIVIL);
            SetLifeBar (playerID, scalingLevelStructureCivil, i, BATTALION_TYPE_STRUCTURE_CIVIL);
            DefineButtonActions (button, playerID, i, BATTALION_TYPE_STRUCTURE_CIVIL);
            SetGroupSelectionButton (playerID, scalingLevelStructureCivil, i, BATTALION_TYPE_STRUCTURE_CIVIL);
            
            if (button.hidden){
                button.hidden = false;
            }
        }
        MarkGroupBordersVisually(playerID, scalingLevelStructureMilitary, BATTALION_TYPE_STRUCTURE_MILITARY);
        MarkGroupBordersVisually(playerID, scalingLevelStructureCivil, BATTALION_TYPE_STRUCTURE_CIVIL);
    }
}

function SetButtonIcon (buttonIcon, playerID, indexOfButtonInList, battalionList, battalionSelectionHighlight)
{
    let battalionIcon = GetBattalionIcon(battalionList, indexOfButtonInList);
    if (battalionIcon){
        let sprite = "stretched:session/portraits/" + battalionIcon;
        if (buttonIcon.sprite != sprite){
            buttonIcon.sprite = sprite
        }
    } else {
        buttonIcon.sprite = "stretched:null_black.dds";
    }
    
    if (battalionList[indexOfButtonInList].selected){
        if (battalionSelectionHighlight.hidden){
            battalionSelectionHighlight.hidden = false;
        }
    } else {
        if (!battalionSelectionHighlight.hidden){
            battalionSelectionHighlight.hidden = true;
        }
    }
}

function SetUnitCountDisplay (scalingLevel, playerID, listIndex, battalionType)
{
    let unitCount = 1;
    let useSmallFont = false;
    let moveFontALittleMoreToBottomLeft = false;
    let buttonUnitCount = undefined;
    let buttonUnitCountSmall = undefined;
    
    if (battalionType == BATTALION_TYPE_UNIT_MILITARY){
        unitCount = g_battalionList[playerID][listIndex].entities.length;
        buttonUnitCount = g_battalionUIUnitCount.military[listIndex];
        buttonUnitCountSmall = g_battalionUIUnitCountSmall.military[listIndex];
        
        if (scalingLevel >=2){
            useSmallFont = true;
        }
    } else if (battalionType == BATTALION_TYPE_UNIT_CIVIL){
        buttonUnitCount = g_battalionUIUnitCount.civil[listIndex];
        buttonUnitCountSmall = g_battalionUIUnitCountSmall.civil[listIndex];
        unitCount = g_civiliansList[playerID][listIndex].entities.length;
        
        if (scalingLevel >=1){
            useSmallFont = true;
        }
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_MILITARY){
        buttonUnitCount = g_battalionUIUnitCount.structureMilitary[listIndex];
        buttonUnitCountSmall = g_battalionUIUnitCountSmall.structureMilitary[listIndex];
        unitCount = g_structuresMilitaryList[playerID][listIndex].entities.length;
        
        if (scalingLevel >=1){
            useSmallFont = true;
        }
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_CIVIL){
        buttonUnitCount = g_battalionUIUnitCount.structureCivil[listIndex];
        buttonUnitCountSmall = g_battalionUIUnitCountSmall.structureCivil[listIndex];
        unitCount = g_structuresCivilList[playerID][listIndex].entities.length;
        
        if (scalingLevel >=1){
            useSmallFont = true;
        }
    }
        
    if (useSmallFont){
        if (!buttonUnitCount.hidden){
            buttonUnitCount.hidden = true;
            buttonUnitCountSmall.hidden = false;
        }
        buttonUnitCountSmall.caption = unitCount;
    } else {
        if (buttonUnitCount.hidden){
            buttonUnitCount.hidden = false;
            buttonUnitCountSmall.hidden = true;
        }
        buttonUnitCount.caption = unitCount;
    }
}

function MarkBattalionSelected (playerID, listIndex, battalionType)
{
    // The number of buttons must be hard set by the UI xml. Stop when we reach that limit
    if (listIndex >= MAX_NUMBER_OF_ICONS){
        return;
    }
    
    let battalionSelectionHighlight = undefined;
    
    if (battalionType == BATTALION_TYPE_UNIT_MILITARY){
        g_battalionList[playerID][listIndex].selected = true;
        battalionSelectionHighlight = g_battalionSelectionHighlight.military[listIndex];
    } else if (battalionType == BATTALION_TYPE_UNIT_CIVIL){
        g_civiliansList[playerID][listIndex].selected = true;
        battalionSelectionHighlight = g_battalionSelectionHighlight.civil[listIndex];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_MILITARY){
        g_structuresMilitaryList[playerID][listIndex].selected = true;
        battalionSelectionHighlight = g_battalionSelectionHighlight.structureMilitary[listIndex];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_CIVIL){
        g_structuresCivilList[playerID][listIndex].selected = true;
        battalionSelectionHighlight = g_battalionSelectionHighlight.structureCivil[listIndex];
    }
    battalionSelectionHighlight.hidden = false;
}

// This version is less performant than the other option.
// However it is needed when a unit is selected not via the UI but when clicking on it on the field
function MarkBattalionSelectedViaBattalionID (battalionID, playerID)
{
    if (playerID != Engine.GetPlayerID()){
        return;
    }
    let listToCheck = g_battalionList[playerID];
    let listIndex = GetIndexFromBattalionID (listToCheck, battalionID)
    if (listIndex > -1){
        MarkBattalionSelected(playerID, listIndex, BATTALION_TYPE_UNIT_MILITARY);
        return;
    }
    
    listToCheck = g_civiliansList[playerID];
    listIndex = GetIndexFromBattalionID (listToCheck, battalionID)
    if (listIndex > -1){
        MarkBattalionSelected(playerID, listIndex, BATTALION_TYPE_UNIT_CIVIL);
        return;
    }
    
    listToCheck = g_structuresMilitaryList[playerID];
    listIndex = GetIndexFromBattalionID (listToCheck, battalionID)
    if (listIndex > -1){
        MarkBattalionSelected(playerID, listIndex, BATTALION_TYPE_STRUCTURE_MILITARY);
        return;
    }
    
    listToCheck = g_structuresCivilList[playerID];
    listIndex = GetIndexFromBattalionID (listToCheck, battalionID)
    if (listIndex > -1){
        MarkBattalionSelected(playerID, listIndex, BATTALION_TYPE_STRUCTURE_CIVIL);
        return;
    }
}

function MarkAllBattalionsUnselected (playerID)
{
    if (playerID <= 0){
        return;
    }
    for (let i = 0; i < g_battalionList[playerID].length; i++){
        MarkBattalionUnselected(playerID, i, BATTALION_TYPE_UNIT_MILITARY);
    }
    for (let i = 0; i < g_civiliansList[playerID].length; i++){
        MarkBattalionUnselected(playerID, i, BATTALION_TYPE_UNIT_CIVIL);
    }
    for (let i = 0; i < g_structuresMilitaryList[playerID].length; i++){
        MarkBattalionUnselected(playerID, i, BATTALION_TYPE_STRUCTURE_MILITARY);
    }
    for (let i = 0; i < g_structuresCivilList[playerID].length; i++){
        MarkBattalionUnselected(playerID, i, BATTALION_TYPE_STRUCTURE_CIVIL);
    }
}

function MarkBattalionUnselected (playerID, listIndex, battalionType)
{
    // The number of buttons must be hard set by the UI xml. Stop when we reach that limit
    if (listIndex >= MAX_NUMBER_OF_ICONS){
        return;
    }
    
    let buttonIcon = undefined;
    let battalionSelectionHighlight = undefined;
    
    if (battalionType == BATTALION_TYPE_UNIT_MILITARY){
        g_battalionList[playerID][listIndex].selected = false;
        buttonIcon = g_battalionUIIcons.military[listIndex];
        battalionSelectionHighlight = g_battalionSelectionHighlight.military[listIndex];
    } else if (battalionType == BATTALION_TYPE_UNIT_CIVIL) {
        g_civiliansList[playerID][listIndex].selected = false;
        buttonIcon = g_battalionUIIcons.civil[listIndex];
        battalionSelectionHighlight = g_battalionSelectionHighlight.civil[listIndex];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_MILITARY) {
        g_structuresMilitaryList[playerID][listIndex].selected = false;
        buttonIcon = g_battalionUIIcons.structureMilitary[listIndex];
        battalionSelectionHighlight = g_battalionSelectionHighlight.structureMilitary[listIndex];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_CIVIL) {
        g_structuresCivilList[playerID][listIndex].selected = false;
        buttonIcon = g_battalionUIIcons.structureCivil[listIndex];
        battalionSelectionHighlight = g_battalionSelectionHighlight.structureCivil[listIndex];
    }
    
    battalionSelectionHighlight.hidden = true;
}

// Scales the button size depending on how many units are on the field
function DefineButtonPosition (button, playerID, indexOfButtonInList, battalionType)
{
    let scalingLevel = 0;
    let scalingValues = undefined;
    let buttonCount = 0;
    
    let buttonUnitCountBackground = undefined;
    
    let militaryAreaIsExpandedLeft = g_battalionUIMilitaryAreaExpanded;

    if (battalionType == BATTALION_TYPE_UNIT_MILITARY){
        buttonCount = g_battalionList[playerID].length;
        scalingValues = g_iconScalingValues.military;
        if (militaryAreaIsExpandedLeft){
            scalingValues = g_iconScalingValues.militaryExpandedLeft;
        }
    } else if (battalionType == BATTALION_TYPE_UNIT_CIVIL){
        buttonCount = g_civiliansList[playerID].length;
        scalingValues = g_iconScalingValues.civil;
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_MILITARY){
        buttonCount = g_structuresMilitaryList[playerID].length;
        scalingValues = g_iconScalingValues.military;
        if (militaryAreaIsExpandedLeft){
            scalingValues = g_iconScalingValues.militaryExpandedLeft;
        }
    }  else if (battalionType == BATTALION_TYPE_STRUCTURE_CIVIL){
        buttonCount = g_structuresCivilList[playerID].length;
        scalingValues = g_iconScalingValues.civil;
    }
    
    if (battalionType == BATTALION_TYPE_UNIT_CIVIL || battalionType == BATTALION_TYPE_STRUCTURE_CIVIL){ // Structures use the same icon size as units
        if (buttonCount <= 15){ // 0-15
            scalingLevel = 0;
        } else if(buttonCount <=28){ // 16-28
            scalingLevel = 1;
        } else if(buttonCount <=40){ // 29-40
            scalingLevel = 2;
        } else { // 41-60 (everything above does not fit onto the screen any more)
            scalingLevel = 3;
        }
    } else {
        if (buttonCount <= (scalingValues[0].NumberOfCols * 2)){ // 0-20
            scalingLevel = 0;
        } else if(buttonCount <= (scalingValues[1].NumberOfCols * 3)){ // 21-36
            scalingLevel = 1;
        } else if(buttonCount <= (scalingValues[2].NumberOfCols * 4)){ // 36-60
            scalingLevel = 2;
        } else { // 56-100 (everything above does not fit onto the screen any more)
            scalingLevel = 3;
        }
    }
    
    let col = (indexOfButtonInList% scalingValues[scalingLevel].NumberOfCols ) + 1;
    let row = Math.floor(indexOfButtonInList/ scalingValues[scalingLevel].NumberOfCols) + 1;
    let size = button.size;
    size.rleft = (col* scalingValues[scalingLevel].ColWidth) - (scalingValues[scalingLevel].ColWidth -scalingValues[scalingLevel].ColMargin);
    size.rright = col* scalingValues[scalingLevel].ColWidth;
    size.rtop = (row*scalingValues[scalingLevel].RowHeight) - (scalingValues[scalingLevel].RowHeight - scalingValues[scalingLevel].RowMargin);
    size.rbottom = row*scalingValues[scalingLevel].RowHeight - scalingValues[scalingLevel].RowMargin;
    
    if (JSON.stringify(size) == JSON.stringify(button.size)){
    } else {
        button.size = size;
    }
    
    return scalingLevel;
}

function SetUnitCounterBackground (playerID, scalingLevel, indexOfButtonInList, battalionType)
{
    let backgroundDimensions = undefined;
    let buttonUnitCountBackground = undefined;
    
    if (battalionType == BATTALION_TYPE_UNIT_MILITARY){
        buttonUnitCountBackground = g_battalionUnitCounterBackground.military[indexOfButtonInList];
        backgroundDimensions = g_unitCounterBackgroundDimensions.military[scalingLevel];
    } else if (battalionType == BATTALION_TYPE_UNIT_CIVIL){
        buttonUnitCountBackground = g_battalionUnitCounterBackground.civil[indexOfButtonInList];
        backgroundDimensions = g_unitCounterBackgroundDimensions.civil[scalingLevel];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_MILITARY){
        buttonUnitCountBackground = g_battalionUnitCounterBackground.military[indexOfButtonInList];
        backgroundDimensions = g_unitCounterBackgroundDimensions.military[scalingLevel];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_CIVIL){
        buttonUnitCountBackground = g_battalionUnitCounterBackground.civil[indexOfButtonInList];
        backgroundDimensions = g_unitCounterBackgroundDimensions.civil[scalingLevel];
    }
    
    let size = buttonUnitCountBackground.size;
    size.rleft = backgroundDimensions.rleft;
    size.rtop = backgroundDimensions.rtop;
    size.rright = backgroundDimensions.rright;
    size.rbottom = backgroundDimensions.rbottom;
    buttonUnitCountBackground.size = size;
}

function SetLifeBar (playerID, scalingLevel, listIndex, battalionType)
{
    let backgroundDimensions = undefined;
    let buttonUnitCountBackground = undefined;
    let lifeBarContainer = undefined;
    let lifeBar = undefined;
    let battalionData = undefined;
    
    if (battalionType == BATTALION_TYPE_UNIT_MILITARY){
        buttonUnitCountBackground = g_battalionUnitCounterBackground.military[listIndex];
        backgroundDimensions = g_unitCounterBackgroundDimensions.military[scalingLevel];
        lifeBarContainer = g_battalionUiLifeBarContainer.military[listIndex]
        battalionData = g_battalionList[playerID][listIndex];
        lifeBar = g_battalionUiLifeBars.military[listIndex]
    } else if(battalionType == BATTALION_TYPE_UNIT_CIVIL){
        buttonUnitCountBackground = g_battalionUnitCounterBackground.civil[listIndex];
        backgroundDimensions = g_unitCounterBackgroundDimensions.civil[scalingLevel];
        lifeBarContainer = g_battalionUiLifeBarContainer.civil[listIndex]
        battalionData = g_civiliansList[playerID][listIndex];
        lifeBar = g_battalionUiLifeBars.civil[listIndex]
    }else if(battalionType == BATTALION_TYPE_STRUCTURE_MILITARY){
        buttonUnitCountBackground = g_battalionUnitCounterBackground.structureMilitary[listIndex];
        backgroundDimensions = g_unitCounterBackgroundDimensions.military[scalingLevel];
        lifeBarContainer = g_battalionUiLifeBarContainer.structureMilitary[listIndex]
        battalionData = g_structuresMilitaryList[playerID][listIndex];
        lifeBar = g_battalionUiLifeBars.structureMilitary[listIndex]
    }else if(battalionType == BATTALION_TYPE_STRUCTURE_CIVIL){
        buttonUnitCountBackground = g_battalionUnitCounterBackground.structureCivil[listIndex];
        backgroundDimensions = g_unitCounterBackgroundDimensions.civil[scalingLevel];
        lifeBarContainer = g_battalionUiLifeBarContainer.structureCivil[listIndex]
        battalionData = g_structuresCivilList[playerID][listIndex];
        lifeBar = g_battalionUiLifeBars.structureCivil[listIndex]
    }
    
    let sizeLifeBarContainer = lifeBarContainer.size;
    sizeLifeBarContainer.rleft = buttonUnitCountBackground.size.rright;
    sizeLifeBarContainer.rtop = 100 - ((100 - backgroundDimensions.rtop) / 2.5);
    lifeBarContainer.size = sizeLifeBarContainer;
    
    
    let maxBattalionHealth = battalionData.maxBattalionHealth;
    let currentBattalionHealth = battalionData.currentBattalionHealth;
    
    let battalionHealthPercent = ((currentBattalionHealth/maxBattalionHealth) * 100);
    // If a battalion has no health component, we devide by zero. We need to fix that here
    if (!battalionHealthPercent){
        battalionHealthPercent = 0;
    }
    
    let lifeBarSize = lifeBar.size;
    lifeBarSize.rright = battalionHealthPercent;
    lifeBar.size = lifeBarSize;

    if (battalionHealthPercent > 66){
        if (lifeBar.sprite != "stretched:battalionUI_icon_lifebar_green.png"){
            lifeBar.sprite = "stretched:battalionUI_icon_lifebar_green.png";
            buttonUnitCountBackground.sprite = "stretched:null_black.dds";
        }
    } else if (battalionHealthPercent > 33){
        if (lifeBar.sprite != "stretched:battalionUI_icon_lifebar_yellow.png"){
            lifeBar.sprite = "stretched:battalionUI_icon_lifebar_yellow.png";
            buttonUnitCountBackground.sprite = "stretched:null_black.dds";
        }
    } else if (battalionHealthPercent == 0){
        if (buttonUnitCountBackground.sprite != "stretched:null_black.dds"){
            buttonUnitCountBackground.sprite = "stretched:null_black.dds";
        }
    } else {
        if (lifeBar.sprite != "stretched:battalionUI_icon_lifebar_red.png"){
            lifeBar.sprite = "stretched:battalionUI_icon_lifebar_red.png";
            buttonUnitCountBackground.sprite = "stretched:battalionUI_icon_lifebar_red.png";
        }
    }
    
}

function DefineButtonActions (button, playerID, indexOfButtonInList, battalionType)
{
    let entityListOfPlayer = undefined;
    
    if (battalionType == BATTALION_TYPE_UNIT_MILITARY){
        entityListOfPlayer = g_battalionList[playerID];
    } else if (battalionType == BATTALION_TYPE_UNIT_CIVIL) {
        entityListOfPlayer = g_civiliansList[playerID];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_MILITARY) {
        entityListOfPlayer = g_structuresMilitaryList[playerID];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_CIVIL) {
        entityListOfPlayer = g_structuresCivilList[playerID];
    }
    
    button.onPress = (function(playerID, listIndex) { return function() {
            let entitiesToSelect = entityListOfPlayer[listIndex].entities;
            
            let buttonAddSelection = Engine.HotkeyIsPressed("HC.battalionUI.addSelection"); // CTRL
            let buttonMultiSelect = Engine.HotkeyIsPressed("HC.battalionUI.multiSelect"); // SHIFT
            
            // Klick without SHIFT or CTRL
            // Selects one battalion and deselects all other
            if (!buttonMultiSelect && !buttonAddSelection){
                g_Selection.reset();
                MarkAllBattalionsUnselected(playerID);
                g_Selection.addList(entitiesToSelect, false, false, false, true);
                MarkBattalionSelected (playerID, listIndex, battalionType);
                g_lastBattalionSelected[playerID].set(battalionType, listIndex);
            }
            
            // Klick with SHIFT
            // Adds all battalions between the one that was clicked and the one that was klicked last
            if (buttonMultiSelect){
                let startIndex = g_lastBattalionSelected[playerID].get(battalionType);
                AddAllBattalionsBetweenTwoIndicesToSelection (playerID, startIndex, listIndex, battalionType)
                
            }
            
            // Klick with CTRL
            // Toggles selection of that battalion
            if (buttonAddSelection){
                // Toggle selection if SHIFT is hold
                if (entityListOfPlayer[listIndex].selected == true){
                    g_Selection.removeList(entitiesToSelect);
                    MarkBattalionUnselected (playerID, listIndex, battalionType);
                } else{
                    g_Selection.addList(entitiesToSelect, false, false, false, true);
                    MarkBattalionSelected (playerID, listIndex, battalionType);
                    g_lastBattalionSelected[playerID].set(battalionType, listIndex);
                }
            }
		}})(playerID, indexOfButtonInList)
        
        
        // Double click seelcts that one battalion and moves the camera to it
        button.onDoublePress = (function(playerID, listIndex) { return function() {
            let entitiesToSelect = entityListOfPlayer[listIndex].entities;
			g_Selection.selectAndMoveTo(entitiesToSelect[0], false);
            g_Selection.addList(entitiesToSelect, false, false, false, true);
		}})(playerID, indexOfButtonInList)
        
        
        // Right klick opens the unit description
        button.onPressRight = (function(playerID, listIndex) { return function() {
            let entitiesToShowTemplateDetails = entityListOfPlayer[listIndex].entities[0];
			let entityState = GetEntityState(entitiesToShowTemplateDetails);
            if (!entityState){
                return;
            }
            let entityTemplate = entityState.template;
            showTemplateDetails(entityTemplate);
		}})(playerID, indexOfButtonInList)
}

function AddAllBattalionsBetweenTwoIndicesToSelection (playerID, indexA, indexB, battalionType)
{
    let entitiesToAdd = undefined;
    
    let startIndex = 0;
    let endIndex = 0;
    if (indexA <= indexB){
        startIndex = indexA; 
        endIndex = indexB;
    } else {
        startIndex = indexB;
        endIndex = indexA;
    }
    
    for (let i = startIndex; i <= endIndex; i++){
        if (battalionType == BATTALION_TYPE_UNIT_MILITARY){
            entitiesToAdd = g_battalionList[playerID][i].entities;
        } else if (battalionType == BATTALION_TYPE_UNIT_CIVIL){
            entitiesToAdd = g_civiliansList[playerID][i].entities;
        } else if (battalionType == BATTALION_TYPE_STRUCTURE_MILITARY){
            entitiesToAdd = g_structuresMilitaryList[playerID][i].entities;
        } else if (battalionType == BATTALION_TYPE_STRUCTURE_CIVIL){
            entitiesToAdd = g_structuresCivilList[playerID][i].entities;
        }
        
        g_Selection.addList(entitiesToAdd, false, false, false, true);
        MarkBattalionSelected (playerID, i, battalionType)
    }
}

function UpdateBattalions (battalionsToUpdate)
{
    for (let player of battalionsToUpdate){
        let playerID = player[0];
        let battalionsToUpdateForPlayer = player[1];
        let battalionWasRemovedFromAnOtherList = false;
        let battalionList = undefined

        // Do nothing if spectator
        if (playerID == -1){
            continue;
        }

        // Initialize data structures if not present
        if (!g_battalionList[playerID]){
            g_battalionList[playerID] = new Array();
        }
        if (!g_civiliansList[playerID]){
            g_civiliansList[playerID] = new Array();
        }
        if (!g_structuresMilitaryList[playerID]){
            g_structuresMilitaryList[playerID] = new Array();
        }
        if (!g_structuresCivilList[playerID]){
            g_structuresCivilList[playerID] = new Array();
        }
        
        let playerBattalions = undefined;
        for (let newBattalionData of battalionsToUpdateForPlayer){
            // Old sorting separating civilians and military units as well as structures and units
            if (!newBattalionData.isStructure && newBattalionData.isCivilian){ // Civil Unit
                playerBattalions = g_civiliansList[playerID];
                battalionWasRemovedFromAnOtherList = RemoveBattalionFromAnOtherListIfPresent (newBattalionData.battalionID, playerID, BATTALION_TYPE_UNIT_CIVIL);
                battalionList = g_civiliansList[playerID];
            } else if (!newBattalionData.isStructure && !newBattalionData.isCivilian){ // Military Unit
                playerBattalions = g_battalionList[playerID];
                battalionWasRemovedFromAnOtherList = RemoveBattalionFromAnOtherListIfPresent (newBattalionData.battalionID, playerID, BATTALION_TYPE_UNIT_MILITARY);
                battalionList = g_battalionList[playerID];
            } else if (newBattalionData.isStructure && newBattalionData.isCivilian){ // Civil Structure
                playerBattalions = g_structuresCivilList[playerID];
                battalionWasRemovedFromAnOtherList = RemoveBattalionFromAnOtherListIfPresent (newBattalionData.battalionID, playerID, BATTALION_TYPE_STRUCTURE_CIVIL);
                battalionList = g_structuresCivilList[playerID];
            } else if (newBattalionData.isStructure && !newBattalionData.isCivilian){ // Military Structure
                playerBattalions = g_structuresMilitaryList[playerID];
                battalionWasRemovedFromAnOtherList = RemoveBattalionFromAnOtherListIfPresent (newBattalionData.battalionID, playerID, BATTALION_TYPE_STRUCTURE_MILITARY);
                battalionList = g_structuresMilitaryList[playerID];
            }

            // if (!newBattalionData.isStructure && newBattalionData.isCenterNode){ // Center Node
            //     playerBattalions = g_civiliansList[playerID];
            //     battalionWasRemovedFromAnOtherList = RemoveBattalionFromAnOtherListIfPresent (newBattalionData.battalionID, playerID, BATTALION_TYPE_UNIT_CIVIL);
            //     battalionList = g_civiliansList[playerID];
            // } else if (newBattalionData.isStructure && !newBattalionData.isCenterNode && newBattalionData.trainsUnits){ // Trains Units
            //     playerBattalions = g_structuresCivilList[playerID];
            //     battalionWasRemovedFromAnOtherList = RemoveBattalionFromAnOtherListIfPresent (newBattalionData.battalionID, playerID, BATTALION_TYPE_STRUCTURE_CIVIL);
            //     battalionList = g_structuresCivilList[playerID];
            // } else if (newBattalionData.isStructure){ // Other Structures
            //     playerBattalions = g_structuresMilitaryList[playerID];
            //     battalionWasRemovedFromAnOtherList = RemoveBattalionFromAnOtherListIfPresent (newBattalionData.battalionID, playerID, BATTALION_TYPE_STRUCTURE_MILITARY);
            //     battalionList = g_structuresMilitaryList[playerID];
            // } else if (!newBattalionData.isStructure && !newBattalionData.isCivilian){ // Unit
            //     playerBattalions = g_battalionList[playerID];
            //     battalionWasRemovedFromAnOtherList = RemoveBattalionFromAnOtherListIfPresent (newBattalionData.battalionID, playerID, BATTALION_TYPE_UNIT_MILITARY);
            //     battalionList = g_battalionList[playerID];
            // }
                
            let newTemplate = Engine.GuiInterfaceCall("GetEntityTemplate", newBattalionData.entities[0]);
            if (newTemplate){
                newBattalionData.template = newTemplate;
                let playerCiv = Engine.GuiInterfaceCall("GetPlayerCiv");
            }

            if (battalionWasRemovedFromAnOtherList){
                newBattalionData.groupID = 100;
                newBattalionData.selected = false;
                AddBattalionToList (newBattalionData, playerID, battalionList);
            } else {
                let battalionIndex = GetIndexFromBattalionID (playerBattalions, newBattalionData.battalionID);
                if (battalionIndex < 0){
                    newBattalionData.groupID = 100;
                    newBattalionData.selected = false;
                    AddBattalionToList (newBattalionData, playerID, battalionList);
                    continue;
                }
                newBattalionData.groupID = playerBattalions[battalionIndex].groupID;
                newBattalionData.selected = playerBattalions[battalionIndex].selected;
                playerBattalions[battalionIndex] = newBattalionData;
            }
        }
    }
}

function RemoveBattalionFromAnOtherListIfPresent (battalionID, playerID, battalionType)
{
    let index = -1;
    if (battalionType != BATTALION_TYPE_UNIT_MILITARY){
        index = CheckIfBattalionIsInList (battalionID, g_battalionList[playerID])
        if (index > -1){
            g_battalionList[playerID].splice(index,1);
            return true;
        }
    }
    
    if (battalionType != BATTALION_TYPE_UNIT_CIVIL){
        index = CheckIfBattalionIsInList (battalionID, g_civiliansList[playerID])
        if (index > -1){
            g_civiliansList[playerID].splice(index,1);
            return true;
        }
    }
    
    if (battalionType != BATTALION_TYPE_STRUCTURE_MILITARY){
        index = CheckIfBattalionIsInList (battalionID, g_structuresMilitaryList[playerID])
        if (index > -1){
            g_structuresMilitaryList[playerID].splice(index,1);
            return true;
        }
    }
    
    if (battalionType != BATTALION_TYPE_STRUCTURE_CIVIL){
        index = CheckIfBattalionIsInList (battalionID, g_structuresCivilList[playerID])
        if (index > -1){
            g_structuresCivilList[playerID].splice(index,1);
            return true;
        }
    }
    return false;
}

function CheckIfBattalionIsInList (battalionID, battalionList)
{
    if (!battalionList){
        return -1;
    }
    for (let i = 0; i < battalionList.length; ++i){
        if (battalionList[i].battalionID == battalionID){
            return i;
        }
    }
    return -1;
}

function GetBattalionIcon(playerBattalionList, battalionIndex)
{
    let icon = playerBattalionList[battalionIndex].battalionIcon;
    return icon;
}

function GetIndexFromBattalionID (battalionList, battalionID)
{
    if (!battalionList){
        return -1;
    }
    for (let i = 0; i < battalionList.length; i++){
        if (battalionList[i].battalionID == battalionID){
            return i;
        }
    }
    return -1;
}

function EntitiesBelongToTheSameBattalion(selectedEntities)
{
    let initialBattalionData = Engine.GuiInterfaceCall("GetBattalionInformationFromEntityId", selectedEntities[0]);
    if (!initialBattalionData){
        return true;
    }
    let battalionIDLastBattalion = initialBattalionData.battalionID;
    
    for(let entity of selectedEntities){
        let battalionData = Engine.GuiInterfaceCall("GetBattalionInformationFromEntityId", entity);
        let battalionIDToCheck = battalionData.battalionID;
        if (battalionIDLastBattalion != battalionIDToCheck){
            return false;
        }
        
        battalionIDLastBattalion = battalionIDToCheck;
    }
    
    return true;
}

function DeleteBattalions (battalionsToDelete)
{
    for (let player of battalionsToDelete){
        let playerID = player[0];
        let battalionsToDeleteForPlayer = player[1];
        let playerMilitaryBattalions = g_battalionList[playerID];
        let playerCivilBattalions = g_civiliansList[playerID];

        // Do nothing if spectator
        if (playerID == -1){
            continue;
        }
        
        for(let battalionData of battalionsToDeleteForPlayer){
            
            // Check if Military Unit
            let battalionIndex = GetIndexFromBattalionID(g_battalionList[playerID], battalionData.battalionID);
            if (battalionIndex > -1){ // If military unit
                g_battalionList[playerID].splice(battalionIndex,1);
                continue;
            }
            
            // Check if Civil Unit
            battalionIndex = GetIndexFromBattalionID(g_civiliansList[playerID], battalionData.battalionID);
            if (battalionIndex > -1){ // If military unit
                g_civiliansList[playerID].splice(battalionIndex,1);
                continue;
            }
            
            // Check if Military Structure
            battalionIndex = GetIndexFromBattalionID(g_structuresMilitaryList[playerID], battalionData.battalionID);
            if (battalionIndex > -1){ // If military unit
                g_structuresMilitaryList[playerID].splice(battalionIndex,1);
                continue;
            }
            
            // Check if Civil Structure
            battalionIndex = GetIndexFromBattalionID(g_structuresCivilList[playerID], battalionData.battalionID);
            if (battalionIndex > -1){ // If military unit
                g_structuresCivilList[playerID].splice(battalionIndex,1);
                continue;
            }
        }
    }
}

function ResetLastBattalionSelected ()
{
    for (let i = 0; i < g_Players.length; i++){
        g_lastBattalionSelected[i] = new Map();
        g_lastBattalionSelected[i].set(BATTALION_TYPE_UNIT_MILITARY, 0);
        g_lastBattalionSelected[i].set(BATTALION_TYPE_UNIT_CIVIL, 0);
        g_lastBattalionSelected[i].set(BATTALION_TYPE_STRUCTURE_MILITARY, 0);
        g_lastBattalionSelected[i].set(BATTALION_TYPE_STRUCTURE_CIVIL, 0);
    }
}

function UngroupInBattalionUI (groupID)
{
    let playerID = Engine.GetPlayerID();
    let newUngroupedBattalions = new Array();
    let newUngroupedCivilBattalions = new Array();
    let newUngroupedMilitaryStructures = new Array();
    let newUngroupedCivilStructures = new Array();
    
    // Go through all battalions. Set the groupId to 100 if they need to be reset, remove the ungrouped battalions from the list
    for (let i = g_battalionList[playerID].length -1; i >=0; i--){
        if (groupID == g_battalionList[playerID][i].groupID){
            g_battalionList[playerID][i].groupID = 100;
            newUngroupedBattalions.unshift(g_battalionList[playerID].splice(i,1)[0]);
        }
    }
    
    for (let i = g_civiliansList[playerID].length -1; i >=0; i--){
        if (groupID == g_civiliansList[playerID][i].groupID){
            g_civiliansList[playerID][i].groupID = 100;
            newUngroupedCivilBattalions.unshift(g_civiliansList[playerID].splice(i,1)[0]);
        }
    }
    
    for (let i = g_structuresMilitaryList[playerID].length -1; i >=0; i--){
        if (groupID == g_structuresMilitaryList[playerID][i].groupID){
            g_structuresMilitaryList[playerID][i].groupID = 100;
            newUngroupedMilitaryStructures.unshift(g_structuresMilitaryList[playerID].splice(i,1)[0]);
        }
    }
    
    for (let i = g_structuresCivilList[playerID].length -1; i >=0; i--){
        if (groupID == g_structuresCivilList[playerID][i].groupID){
            g_structuresCivilList[playerID][i].groupID = 100;
            newUngroupedCivilStructures.unshift(g_structuresCivilList[playerID].splice(i,1)[0]);
        }
    }
    
    // Add the ungrouped entities to the end of the list
    for(let battalion of newUngroupedBattalions){
        AddBattalionToList (battalion, playerID, g_battalionList[playerID]);
    }
    for(let battalion of newUngroupedCivilBattalions){
        AddBattalionToList (battalion, playerID, g_civiliansList[playerID]);
    }
    for(let battalion of newUngroupedMilitaryStructures){
        AddBattalionToList (battalion, playerID, g_structuresMilitaryList[playerID]);
    }
    for(let battalion of newUngroupedCivilStructures){
        AddBattalionToList (battalion, playerID, g_structuresCivilList[playerID]);
    }
        
    RefreshBattalionUI(playerID);
}

function GroupInBattalionUI (groupID, entitiesToGroup)
{
    let battalionsToAddToGroup = new Set();
    let playerID = Engine.GetPlayerID();
    let newGroupedBattalions = new Array();
    let newGroupedCivilBattalions = new Array();
    let newGroupedMilitaryStructures = new Array();
    let newGroupedCivilStructures = new Array();
    
    // Filter which battalions will be added to the group
    for(let entity of entitiesToGroup){
        let battalionData = Engine.GuiInterfaceCall("GetBattalionInformationFromEntityId", entity);
        if (!battalionData){
			continue;
		}
        battalionsToAddToGroup.add(battalionData.battalionID);
    }
    
    // Go through all unit battalions and set the group ID; Remove the battalions from the list
    for (let battalionIDToAdd of battalionsToAddToGroup){
        // Military Units
        for (let i = g_battalionList[playerID].length -1; i >=0; i--){
            if (battalionIDToAdd == g_battalionList[playerID][i].battalionID){
                g_battalionList[playerID][i].groupID = groupID;
                let battaliontoAdd = g_battalionList[playerID].splice(i,1)[0];
                AddBattalionToList (battaliontoAdd, playerID, newGroupedBattalions, groupID);
            }
        }
        // Civil Units
        for (let i = g_civiliansList[playerID].length -1; i >=0; i--){
            if (battalionIDToAdd == g_civiliansList[playerID][i].battalionID){
                g_civiliansList[playerID][i].groupID = groupID;
                let battaliontoAdd = g_civiliansList[playerID].splice(i,1)[0];
                AddBattalionToList (battaliontoAdd, playerID, newGroupedCivilBattalions, groupID);
            }
        }
        // Military Structures
        for (let i = g_structuresMilitaryList[playerID].length -1; i >=0; i--){
            if (battalionIDToAdd == g_structuresMilitaryList[playerID][i].battalionID){
                g_structuresMilitaryList[playerID][i].groupID = groupID;
                let battaliontoAdd = g_structuresMilitaryList[playerID].splice(i,1)[0];
                AddBattalionToList (battaliontoAdd, playerID, newGroupedMilitaryStructures, groupID);
            }
        }
        // Civil Structures
        for (let i = g_structuresCivilList[playerID].length -1; i >=0; i--){
            if (battalionIDToAdd == g_structuresCivilList[playerID][i].battalionID){
                g_structuresCivilList[playerID][i].groupID = groupID;
                let battaliontoAdd = g_structuresCivilList[playerID].splice(i,1)[0];
                AddBattalionToList (battaliontoAdd, playerID, newGroupedCivilStructures, groupID);
            }
        }
    }
    
    // Military
    // Get the index where the group shall be inserted
    let indexToInsertGroup = g_battalionList[playerID].length;
    for (let i = 0; i < g_battalionList[playerID].length; i++){
        if (g_battalionList[playerID][i].groupID > groupID){
            indexToInsertGroup = i;
            break;
        }
    }
    
    // Insert the group at the defined position
    for (let battalionToInsert of newGroupedBattalions){
        g_battalionList[playerID].splice(indexToInsertGroup,0, battalionToInsert);
        ++ indexToInsertGroup;
    }
    
    // Civil
    // Get the index where the group shall be inserted
    indexToInsertGroup = g_civiliansList[playerID].length;
    for (let i = 0; i < g_civiliansList[playerID].length; i++){
        if (g_civiliansList[playerID][i].groupID > groupID){
            indexToInsertGroup = i;
            break;
        }
    }
    
    // Insert the group at the defined position
    for (let battalionToInsert of newGroupedCivilBattalions){
        g_civiliansList[playerID].splice(indexToInsertGroup,0, battalionToInsert);
        ++ indexToInsertGroup;
    }
    
    // Military Structures
    // Get the index where the group shall be inserted
    for (let i = 0; i < g_structuresMilitaryList[playerID].length; i++){
        if (g_structuresMilitaryList[playerID][i].groupID > groupID){
            indexToInsertGroup = i;
            break;
        }
    }
    
    // Insert the group at the defined position
    for (let battalionToInsert of newGroupedMilitaryStructures){
        g_structuresMilitaryList[playerID].splice(indexToInsertGroup,0, battalionToInsert);
        ++ indexToInsertGroup;
    }
    
    // Civil
    // Get the index where the group shall be inserted
    indexToInsertGroup = g_structuresCivilList[playerID].length;
    for (let i = 0; i < g_structuresCivilList[playerID].length; i++){
        if (g_structuresCivilList[playerID][i].groupID > groupID){
            indexToInsertGroup = i;
            break;
        }
    }
    
    // Insert the group at the defined position
    for (let battalionToInsert of newGroupedCivilStructures){
        g_structuresCivilList[playerID].splice(indexToInsertGroup,0, battalionToInsert);
        ++ indexToInsertGroup;
    }
    
    RefreshBattalionUI(playerID);
}

function MarkGroupBordersVisually (playerID, scalingLevel, battalionType)
{
    let battalionList = undefined;
    
    if (battalionType == BATTALION_TYPE_UNIT_MILITARY){
        battalionList = g_battalionList[playerID];
    } else if (battalionType == BATTALION_TYPE_UNIT_CIVIL){
        battalionList = g_civiliansList[playerID];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_MILITARY){
        battalionList = g_structuresMilitaryList[playerID];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_CIVIL){
        battalionList = g_structuresCivilList[playerID];
    }
    
    for (let i = 0; i < battalionList.length; ++i){

        // The number of buttons must be hard set by the UI xml. Stop when we reach that limit
        if (i >= MAX_NUMBER_OF_ICONS){
            continue;
        }
            
        let battalionToCheck = battalionList[i];
        if (battalionToCheck && battalionToCheck.groupID != 100){   // If the battalion is a member of a group
            let isFirstGroupMember = checkIfBattalionIsFirstMemberOfGroup (battalionToCheck, battalionList, i);
            let isLastGroupMember = checkIfBattalionIsLastMemberOfGroup (battalionToCheck, battalionList, i);
            drawGroupBorders (i, isFirstGroupMember, isLastGroupMember, scalingLevel, battalionType)
        } else{
            removeGroupBorders (i, battalionType);
        }
    }
}

// BUG: Returns false if it needs to be true and true if it needs to be false
function checkIfBattalionIsFirstMemberOfGroup (battalionToCheck, battalionList, battalionIndex)
{
    let previousBattalion = battalionList[battalionIndex-1];
    
    if (previousBattalion){ // If not the first battalion in the battalion list
        if (previousBattalion.groupID != battalionToCheck.groupID){ // Check if the previous entry is member of the same group
            return true;
        } else {
            return false;
        }
    } else { // If first entry in battalion list
        return true;
    }
}

function checkIfBattalionIsLastMemberOfGroup (battalionToCheck, battalionList, battalionIndex)
{
    let nextBattalion = battalionList[battalionIndex+1];
    
    if (nextBattalion){ // If not the last entry in the battalion List
        if (nextBattalion.groupID != battalionToCheck.groupID){ // Check if it's the last member of that group
            return true;
        } else {
            return false;
        }
    } else { // If last entry in the battalion List
        return true; 
    }
}

function drawGroupBorders (battalionIndex, isFirstGroupMember, isLastGroupMember, scalingLevel, battalionType)
{
    let groupBoxLineTop = undefined;
    let groupBoxLineBottom = undefined;
    let groupBoxLineRight = undefined;
    let groupBoxLineLeft = undefined; 
    
    // Define buttons
    if (battalionType == BATTALION_TYPE_UNIT_MILITARY){
        groupBoxLineTop = g_battalionUIGroupBorders.military.top[battalionIndex];
        groupBoxLineBottom = g_battalionUIGroupBorders.military.bottom[battalionIndex]
        groupBoxLineLeft = g_battalionUIGroupBorders.military.left[battalionIndex]
        groupBoxLineRight = g_battalionUIGroupBorders.military.right[battalionIndex]
    } else if (battalionType == BATTALION_TYPE_UNIT_CIVIL){
        groupBoxLineTop =g_battalionUIGroupBorders.civil.top[battalionIndex];
        groupBoxLineBottom = g_battalionUIGroupBorders.civil.bottom[battalionIndex];
        groupBoxLineLeft = g_battalionUIGroupBorders.civil.left[battalionIndex];
        groupBoxLineRight = g_battalionUIGroupBorders.civil.right[battalionIndex];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_MILITARY){
        groupBoxLineTop =g_battalionUIGroupBorders.structureMilitary.top[battalionIndex];
        groupBoxLineBottom = g_battalionUIGroupBorders.structureMilitary.bottom[battalionIndex];
        groupBoxLineLeft = g_battalionUIGroupBorders.structureMilitary.left[battalionIndex];
        groupBoxLineRight = g_battalionUIGroupBorders.structureMilitary.right[battalionIndex];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_CIVIL){
        groupBoxLineTop =g_battalionUIGroupBorders.structureCivil.top[battalionIndex];
        groupBoxLineBottom = g_battalionUIGroupBorders.structureCivil.bottom[battalionIndex];
        groupBoxLineLeft = g_battalionUIGroupBorders.structureCivil.left[battalionIndex];
        groupBoxLineRight = g_battalionUIGroupBorders.structureCivil.right[battalionIndex];
    }
    
    // Make the borders visible if needed
    if (groupBoxLineTop.hidden){
        groupBoxLineTop.hidden = false;
    }
    if (groupBoxLineBottom.hidden){
        groupBoxLineBottom.hidden = false;
    }
    if (groupBoxLineLeft.hidden == isFirstGroupMember){
        groupBoxLineLeft.hidden = !isFirstGroupMember;
    }
    if (groupBoxLineRight.hidden == isLastGroupMember){
        groupBoxLineRight.hidden = !isLastGroupMember;
    }
    
    // Scaling factor determines how much the lines grow depending on the scaling level
    let scalingFactor = 2;
    if (battalionType == BATTALION_TYPE_UNIT_MILITARY || battalionType == BATTALION_TYPE_STRUCTURE_MILITARY){ // Units and Structures share the same sclaing values
        scalingFactor = 2;
        if (scalingLevel == 3){
            scalingFactor = 2.5;
        }
    }
    
    // Scale Top Line
    let sizeLineTop = groupBoxLineTop.size;
    sizeLineTop.rleft = g_borderBaseValues.top.left - (scalingFactor * scalingLevel);
    sizeLineTop.rtop = g_borderBaseValues.top.top - (scalingFactor * scalingLevel);
    sizeLineTop.rright = g_borderBaseValues.top.right + (scalingFactor * scalingLevel);
    sizeLineTop.rbottom = g_borderBaseValues.top.bottom;
    groupBoxLineTop.size = sizeLineTop;
    
    // Scale Bottom Line
    let sizeLineBottom = groupBoxLineBottom.size;
    sizeLineBottom.rleft = g_borderBaseValues.bottom.left - (scalingFactor * scalingLevel);
    sizeLineBottom.rtop = g_borderBaseValues.bottom.top;
    sizeLineBottom.rright = g_borderBaseValues.bottom.right + (scalingFactor * scalingLevel);
    sizeLineBottom.rbottom = g_borderBaseValues.bottom.bottom + (scalingFactor * scalingLevel);
    groupBoxLineBottom.size = sizeLineBottom;
    
    // Scale Left Line
    let sizeLineLeft = groupBoxLineLeft.size;
    sizeLineLeft.rleft = g_borderBaseValues.left.left - (scalingFactor * scalingLevel);
    sizeLineLeft.rtop = g_borderBaseValues.left.top  - (scalingFactor * scalingLevel);
    sizeLineLeft.rright = g_borderBaseValues.left.right;
    sizeLineLeft.rbottom = g_borderBaseValues.left.bottom; + (scalingFactor * scalingLevel);
    groupBoxLineLeft.size = sizeLineLeft;
    
    // Scale Right Line
    let sizeLineRight = groupBoxLineRight.size;
    sizeLineRight.rleft = g_borderBaseValues.right.left;
    sizeLineRight.rtop = g_borderBaseValues.right.top  - (scalingFactor * scalingLevel);
    sizeLineRight.rright = g_borderBaseValues.right.right  + (scalingFactor * scalingLevel)
    sizeLineRight.rbottom = g_borderBaseValues.right.bottom; + (scalingFactor * scalingLevel);
    groupBoxLineRight.size = sizeLineRight;
}

function removeGroupBorders (battalionIndex, battalionType)
{
    if (battalionIndex >= MAX_NUMBER_OF_ICONS){
        return;
    }
    
    let groupBoxLineTop = undefined;
    let groupBoxLineBottom = undefined;
    let groupBoxLineRight = undefined;
    let groupBoxLineLeft = undefined; 
    
    // Define buttons
    if (battalionType == BATTALION_TYPE_UNIT_MILITARY){
        groupBoxLineTop = g_battalionUIGroupBorders.military.top[battalionIndex];
        groupBoxLineBottom = g_battalionUIGroupBorders.military.bottom[battalionIndex]
        groupBoxLineLeft = g_battalionUIGroupBorders.military.left[battalionIndex]
        groupBoxLineRight = g_battalionUIGroupBorders.military.right[battalionIndex]
    } else if (battalionType == BATTALION_TYPE_UNIT_CIVIL){
        groupBoxLineTop =g_battalionUIGroupBorders.civil.top[battalionIndex];
        groupBoxLineBottom = g_battalionUIGroupBorders.civil.bottom[battalionIndex];
        groupBoxLineLeft = g_battalionUIGroupBorders.civil.left[battalionIndex];
        groupBoxLineRight = g_battalionUIGroupBorders.civil.right[battalionIndex];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_MILITARY){
        groupBoxLineTop =g_battalionUIGroupBorders.structureMilitary.top[battalionIndex];
        groupBoxLineBottom = g_battalionUIGroupBorders.structureMilitary.bottom[battalionIndex];
        groupBoxLineLeft = g_battalionUIGroupBorders.structureMilitary.left[battalionIndex];
        groupBoxLineRight = g_battalionUIGroupBorders.structureMilitary.right[battalionIndex];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_CIVIL){
        groupBoxLineTop =g_battalionUIGroupBorders.structureCivil.top[battalionIndex];
        groupBoxLineBottom = g_battalionUIGroupBorders.structureCivil.bottom[battalionIndex];
        groupBoxLineLeft = g_battalionUIGroupBorders.structureCivil.left[battalionIndex];
        groupBoxLineRight = g_battalionUIGroupBorders.structureCivil.right[battalionIndex];
    }
    
    if (!groupBoxLineTop.hidden){
        groupBoxLineTop.hidden = true;
    }
    if (!groupBoxLineBottom.hidden){
        groupBoxLineBottom.hidden = true;
    }
    if (!groupBoxLineLeft.hidden){
        groupBoxLineLeft.hidden = true;
    }
    if (!groupBoxLineRight.hidden){
        groupBoxLineRight.hidden = true;  
    }
}

function SetGroupSelectionButton (playerID, scalingLevel, listIndex, battalionType)
{
    let battalionList = g_battalionList[playerID];
    let battalionGroupSelectionButtons = undefined;
    let groupSelectionButtonSizeValues = undefined
    let groupNumberDisplay = undefined;
    let groupNumberDisplaySmall = undefined;
    let useSmallFont = false;
    
    if (battalionType == BATTALION_TYPE_UNIT_MILITARY){
        battalionList = g_battalionList[playerID];
        battalionGroupSelectionButtons = g_battalionUIGroupSelectionButtons.military;
        groupSelectionButtonSizeValues = g_groupNumberButtonSize.military;
        groupNumberDisplay = g_battalionUIGroupSelectionButtonsGroupNumber.military[listIndex];
        groupNumberDisplaySmall = g_battalionUIGroupSelectionButtonsGroupNumberSmall.military[listIndex];
    } else if (battalionType == BATTALION_TYPE_UNIT_CIVIL) {
        battalionList = g_civiliansList[playerID];
        battalionGroupSelectionButtons = g_battalionUIGroupSelectionButtons.civil;
        groupSelectionButtonSizeValues = g_groupNumberButtonSize.civil;
        groupNumberDisplay = g_battalionUIGroupSelectionButtonsGroupNumber.civil[listIndex];
        groupNumberDisplaySmall = g_battalionUIGroupSelectionButtonsGroupNumberSmall.civil[listIndex];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_MILITARY) {
        battalionList = g_structuresMilitaryList[playerID];
        battalionGroupSelectionButtons = g_battalionUIGroupSelectionButtons.structureMilitary;
        groupSelectionButtonSizeValues = g_groupNumberButtonSize.military;
        groupNumberDisplay = g_battalionUIGroupSelectionButtonsGroupNumber.structureMilitary[listIndex];
        groupNumberDisplaySmall = g_battalionUIGroupSelectionButtonsGroupNumberSmall.structureMilitary[listIndex];
    } else if (battalionType == BATTALION_TYPE_STRUCTURE_CIVIL) {
        battalionList = g_structuresCivilList[playerID];
        battalionGroupSelectionButtons = g_battalionUIGroupSelectionButtons.structureCivil;
        groupSelectionButtonSizeValues = g_groupNumberButtonSize.civil;
        groupNumberDisplay = g_battalionUIGroupSelectionButtonsGroupNumber.structureCivil[listIndex];
        groupNumberDisplaySmall = g_battalionUIGroupSelectionButtonsGroupNumberSmall.structureCivil[listIndex];
    }
    
    let battalionToCheck = battalionList[listIndex];
    let battalionGroupSelectionButton = battalionGroupSelectionButtons[listIndex];
    let battalionGroupID = battalionToCheck.groupID;
    let isBattalionFirstGroupMember = !checkIfBattalionIsFirstMemberOfGroup (battalionToCheck, battalionList, listIndex);
    
    // Set visibility of the button, return if not visible
    if (battalionGroupID == 100 || isBattalionFirstGroupMember){
        battalionGroupSelectionButton.hidden = true;
        return;
    }
    battalionGroupSelectionButton.hidden = false;
    
    // Scale the button
    let scalingFactor = 2;
    if (battalionType == BATTALION_TYPE_UNIT_MILITARY || battalionType == BATTALION_TYPE_STRUCTURE_MILITARY){
        scalingFactor = 2;
        if (scalingLevel == 3){
            scalingFactor = 2.5;
        }
    }
    
    
    let buttonSize = battalionGroupSelectionButton.size;
    buttonSize.rleft = g_borderBaseValues.top.left - (scalingFactor * scalingLevel);
    buttonSize.rtop = g_borderBaseValues.top.top - (scalingFactor * scalingLevel);
    buttonSize.rright = groupSelectionButtonSizeValues[scalingLevel].rright;
    buttonSize.rbottom = groupSelectionButtonSizeValues[scalingLevel].rbottom;
    battalionGroupSelectionButton.size = buttonSize;
    
    if (battalionType == BATTALION_TYPE_UNIT_CIVIL || battalionType == BATTALION_TYPE_STRUCTURE_CIVIL){
        let captionSize = groupNumberDisplaySmall.size;
        if (scalingLevel >= 3){
            captionSize.rtop = -30;
        } else{
            captionSize.rtop = -10;
        }
        groupNumberDisplaySmall.size = captionSize;
    }
    
    // Scale the font
    if (battalionType == BATTALION_TYPE_UNIT_MILITARY || battalionType == BATTALION_TYPE_STRUCTURE_MILITARY){
        if (scalingLevel >=2){
            useSmallFont = true;
        }
    } else {
        if (scalingLevel >=2){
            useSmallFont = true;
        }
    }
    
    if (useSmallFont){
        groupNumberDisplay.hidden = true;
        groupNumberDisplaySmall.hidden = false;
        groupNumberDisplaySmall.caption = battalionGroupID;
    } else {
        groupNumberDisplay.hidden = false;
        groupNumberDisplaySmall.hidden = true;
        groupNumberDisplay.caption = battalionGroupID;
    }
    
    
    // Define the functionality of the group selection button
    battalionGroupSelectionButton.onPress = (function(playerID, groupID, battalionType) { return function() {
        let battalionsToSelect = new Array();
        let entitiesToSelect = new Array();
        
        let buttonAddSelection = Engine.HotkeyIsPressed("HC.battalionUI.addSelection"); // CTRL
        let buttonMultiSelect = Engine.HotkeyIsPressed("HC.battalionUI.multiSelect"); // SHIFT
        
        // Determine which battalion indices to add to selection
        for (let i = 0; i < battalionList.length; i++){
            if (battalionList[i].groupID == groupID){
               battalionsToSelect.push(i); 
            }
        }
        
        // Determin entity IDs to add to selection
        for (let battalionIndexToSelect of battalionsToSelect){
            let battalionToSelect = battalionList[battalionIndexToSelect];
            for (let entityToSelect of battalionToSelect.entities){
                entitiesToSelect.push(entityToSelect);
            }
        }
        
        // Klick without SHIFT or CTRL
        if (!buttonMultiSelect && !buttonAddSelection){
            g_Selection.reset();
            MarkAllBattalionsUnselected(playerID);
            g_Selection.addList(entitiesToSelect, false, false, true, true);
            for (let battalionIndexToSelect of battalionsToSelect){
                MarkBattalionSelected (playerID, battalionIndexToSelect, battalionType);
                g_lastBattalionSelected[playerID].set(battalionType, battalionIndexToSelect);
            }
        }
        
        // Klick with CTRL
            if (buttonAddSelection){
                // Toggle selection if CTRL is hold
                // If not every battalion in a group is selected, add it to the selection
                // Only unselect the group if CTRL is held and all battalions in a group are selected
                if (isEachBattalionOfGroupOfBattalionsSelected (battalionList, battalionsToSelect)){
                    g_Selection.removeList(entitiesToSelect);
                    for (let battalionIndexToSelect of battalionsToSelect){
                        MarkBattalionUnselected (playerID, battalionIndexToSelect, battalionType);
                    }
                } else{
                    g_Selection.addList(entitiesToSelect, false, false, false, true);
                    for (let battalionIndexToSelect of battalionsToSelect){
                        MarkBattalionSelected (playerID, battalionIndexToSelect, battalionType);
                        g_lastBattalionSelected[playerID].set(battalionType, battalionIndexToSelect);
                    }
                }
            }
            
    }})(playerID, battalionGroupID, battalionType)
    
    // Right klick removes the units of that battalion type from the group, not the whole group
    battalionGroupSelectionButton.onPressRight = (function(playerID, groupID, battalionType) { return function() {
        let battalionsToUnGroup = new Array();
        
        let buttonAddSelection = Engine.HotkeyIsPressed("session.garrison");
        let buttonMultiSelect = Engine.HotkeyIsPressed("selection.add");
        
        // Determine which battalion indices to add to selection
        for (let i = (battalionList.length -1 ); i >= 0; i--){
            if (battalionList[i].groupID == groupID){
                battalionList[i].groupID = 100;
                battalionsToUnGroup.unshift(battalionList[i]);
                battalionList.splice(i, 1);
            }
        }
        
        for (let battalion of battalionsToUnGroup){
            AddBattalionToList (battalion, playerID, battalionList)
        }
        
        RefreshBattalionUI(playerID);
        
    }})(playerID, battalionGroupID, battalionList)
}

function isEachBattalionOfGroupOfBattalionsSelected (battalionList, battalionIndices)
{
    for (let battalionIndexToCheck of battalionIndices){
        let battalionToCheck = battalionList[battalionIndexToCheck];
        if (battalionToCheck.selected == false){
            return false;
        }
    }
    return true;
}

function ToggleUnitsAndStructures()
{
    g_mainUIContainer.military.hidden = !g_mainUIContainer.military.hidden;
    g_mainUIContainer.civil.hidden = !g_mainUIContainer.civil.hidden;
    g_mainUIContainer.structureMilitary.hidden = !g_mainUIContainer.structureMilitary.hidden;
    g_mainUIContainer.structureCivil.hidden = !g_mainUIContainer.structureCivil.hidden;

    let thisPlayer = Engine.GetPlayerID();
    let playerCiv = Engine.GuiInterfaceCall("GetPlayerCiv");
    let toggleUnitsAndStructuresButtonIcon = undefined;
    
    if (g_mainUIContainer.military.hidden){
        toggleUnitsAndStructuresButtonIcon = "stretched:session/icons/battalion_UI/build_bonus.png"
        g_battaionUIDisplayingStructures = true;
    } else {
        toggleUnitsAndStructuresButtonIcon = "stretched:session/factions/" + playerCiv + "/resource_population.png"
        g_battaionUIDisplayingStructures = false;
    }
    
    Engine.GetGUIObjectByName("toggleUnitsAndStructuresButtonIcon").sprite = toggleUnitsAndStructuresButtonIcon;

    RefreshBattalionUI(thisPlayer);
}

function ToggleCivilBattalionsArea ()
{
    let civilBattalionArea = Engine.GetGUIObjectByName("civilBattalionArea");
    let civilMilitaryArea = Engine.GetGUIObjectByName("militaryBattalionArea");
    let toggleCivilBattalionsButton = Engine.GetGUIObjectByName("toggleCivilBattalionsButton");
    civilBattalionArea.hidden = !civilBattalionArea.hidden;
    let size = civilMilitaryArea.size;
    if (civilBattalionArea.hidden){
        size.rleft = g_battalionUICivilAreaX;
        toggleCivilBattalionsButton.sprite = "stretched:session/minimap-show-civil-battalions.png";
        g_battalionUIMilitaryAreaExpanded = true;
    } else {
        size.rleft = g_battalionUIMilitaryAreaX;
        toggleCivilBattalionsButton.sprite = "stretched:session/minimap-hide-civil-battalions.png";
        g_battalionUIMilitaryAreaExpanded = false;
    }
    civilMilitaryArea.size = size;
    
    
    let thisPlayer = Engine.GetPlayerID();
    RefreshBattalionUI(thisPlayer);
}

function UpdateAllBattalionOrders (battalionOrders)
{
    if (!battalionOrders){
        return;
    }
    let thisPlayer = Engine.GetPlayerID();

    // Do nothing if spectator
    if (thisPlayer == -1){
        return;
    }
    
    UpdateBattalionListOrders (g_civiliansList[thisPlayer], battalionOrders[thisPlayer], BATTALION_TYPE_UNIT_CIVIL);
    UpdateBattalionListOrders (g_battalionList[thisPlayer], battalionOrders[thisPlayer], BATTALION_TYPE_UNIT_MILITARY);
}

function UpdateBattalionListOrders (battalionList, allBattalionOrders, battalionType)
{
    if (!battalionList){
        return;
    }
    
    let orderIconsList = undefined;
    let orderIconsContainer = undefined;
    if (battalionType == BATTALION_TYPE_UNIT_MILITARY){
        orderIconsList = g_battalionOrdersIcon.military;
        orderIconsContainer = g_battalionOrdersContainer.military;
    } else if (battalionType == BATTALION_TYPE_UNIT_CIVIL){
        orderIconsList = g_battalionOrdersIcon.civil;
        orderIconsContainer = g_battalionOrdersContainer.civil;
    }
    
    for (let i = 0; i < battalionList.length; i++){
        let battalionID = battalionList[i].battalionID;
        let battalionOrders = allBattalionOrders.get(battalionID);

        // More Battalions on the field than icons available. Igonre them.
        if (i >= MAX_NUMBER_OF_ICONS){
            return;
        }
        
        if (!battalionOrders || !battalionOrders[0]){
            if (!orderIconsContainer[i].hidden){
                orderIconsContainer[i].hidden = true;
            }
            continue;
        }
        
        if (battalionOrders[0].type == "Walk" || battalionOrders[0].type == "FormationWalk"){
            orderIconsList[i].sprite = "stretched:session/icons/promote.png";
            if (orderIconsContainer[i].hidden){
                orderIconsContainer[i].hidden = false;
            }
        } else if (battalionOrders[0].type == "Gather"){
            if (battalionOrders[0].data.type.generic == "metal"){
                orderIconsList[i].sprite = "stretched:session/icons/resources/metal.png";
            } else if (battalionOrders[0].data.type.generic == "wood"){
                orderIconsList[i].sprite = "stretched:session/icons/resources/wood.png";
            } else if (battalionOrders[0].data.type.generic == "stone"){
                orderIconsList[i].sprite = "stretched:session/icons/resources/stone.png";
            } else if (battalionOrders[0].data.type.generic == "food"){
                orderIconsList[i].sprite = "stretched:session/icons/resources/food.png";
            }
            if (orderIconsContainer[i].hidden){
                orderIconsContainer[i].hidden = false;
            }
        } else if (battalionOrders[0].type == "ReturnResource" && battalionOrders[1] && battalionOrders[1].type == "Gather"){
            if (battalionOrders[1].data.type.generic == "metal"){
                orderIconsList[i].sprite = "stretched:session/icons/resources/metal.png";
            } else if (battalionOrders[1].data.type.generic == "wood"){
                orderIconsList[i].sprite = "stretched:session/icons/resources/wood.png";
            } else if (battalionOrders[1].data.type.generic == "stone"){
                orderIconsList[i].sprite = "stretched:session/icons/resources/stone.png";
            } else if (battalionOrders[1].data.type.generic == "food"){
                orderIconsList[i].sprite = "stretched:session/icons/resources/food.png";
            }
            if (orderIconsContainer[i].hidden){
                orderIconsContainer[i].hidden = false;
            }
        } else if (battalionOrders[0].type == "Attack"){
            orderIconsList[i].sprite = "stretched:session/icons/battalion_UI/order_attack.png";
            if (orderIconsContainer[i].hidden){
                orderIconsContainer[i].hidden = false;
            }
        }
    }
}

// Sets the custom textures for the UI depending on the faction
function SetUIBackgroundTexture()
{
    let thisPlayer = Engine.GetPlayerID();
    let playerCiv = Engine.GuiInterfaceCall("GetPlayerCiv");

    // Spectator and Gaia player get Hyrule UI
    // ID:  Spectator: -1; Gaia: 0
    if (thisPlayer <= 0 ){
        playerCiv = "hylian";
    }

    // HC Military and Civil Battalions area
    let militaryBattalionsPanelSprite = "militaryBattalionsPanel_" + playerCiv;
    Engine.GetGUIObjectByName("militaryBattalionArea").sprite = militaryBattalionsPanelSprite;
    
    let civilBattalionsPanelSprite = "civilBattalionsPanel_" + playerCiv;
    Engine.GetGUIObjectByName("civilBattalionArea").sprite = civilBattalionsPanelSprite;

    // 0 a.d. UI elements
    let supplementalSelectionDetailsSprite = "supplementalDetailsPanel_" + playerCiv;
    Engine.GetGUIObjectByName("supplementalSelectionDetails").sprite = supplementalSelectionDetailsSprite;

    let selectionDetailsPanelSprite = "selectionDetailsPanel_" + playerCiv;
    Engine.GetGUIObjectByName("selectionDetails").sprite = selectionDetailsPanelSprite;

    let unitCommandsPanelSprite = "unitCommandsPanel_" + playerCiv;
    Engine.GetGUIObjectByName("unitCommands").sprite = unitCommandsPanelSprite;

    // Mini map
    let minimapPanelOverlaySprite = "minimapPanelOverlay_" + playerCiv;
    Engine.GetGUIObjectByName("mimimapPanelOverlay").sprite = minimapPanelOverlaySprite;
    
    // Top panel
    let topPanelSprite = "topPanel_" + playerCiv;
    Engine.GetGUIObjectByName("topPanel").sprite = topPanelSprite;

    // Population cap icons
    let populationIconSprite = "stretched:session/factions/" + playerCiv + "/resource_population.png"
  //  Engine.GetGUIObjectByName("resource[2]_icon").sprite = populationIconSprite;

    // Toggle Structures and  Buildings panel icon
    let toggleUnitsAndStructuresButtonIcon = "stretched:session/factions/" + playerCiv + "/resource_population.png"
    Engine.GetGUIObjectByName("toggleUnitsAndStructuresButtonIcon").sprite = populationIconSprite;
    
}
