const CIV_CHOICE_BUTTON_WIDTH = 276;
const CIV_CHOICE_BUTTON_SPACING = 50;

const HEROES_PER_FACTION = 3;
const MAX_CIV_CHOICE_BUTTONS = 6;
const CIV_CHOICE_ROW_LEFT = 8.4;
const CIV_CHOICE_ROW_RIGHT = 96;
let allowHeroSelectionDuringMatch = false;

let selectedHeroes = [];
let activatedHeroes = new Set();

function initCivChoicesDialog()
{
	if (g_ViewedPlayer < 0)
		return;

	let currentPlayer = g_Players[g_ViewedPlayer];
	let civChoices = g_CivData[currentPlayer.civ].CivChoices;
	if (civChoices === undefined)
		return;

	for (let i = 0; i < civChoices.length; ++i)
	{
		let civChoiceTechResearched = Engine.GuiInterfaceCall("IsTechnologyResearched", {
			"tech": civChoices[i],
			"player": g_ViewedPlayer
		});
		if (civChoiceTechResearched)
			return;
	}

	let civChoicesDialogPanel = Engine.GetGUIObjectByName("civChoicesDialogPanel");
	resetCivChoiceSlots();
	
	// Percentage size values for each button
	let buttonWidth = 22;
	let buttonHeight = 37.4;

	if(civChoices.length==4)
	{
		buttonWidth = 20;
		buttonHeight= 34;
	}


	let buttonSpacing = 3;
	let borderTop = 5;	
	let rowWidth = CIV_CHOICE_ROW_RIGHT - CIV_CHOICE_ROW_LEFT;
	let buttonsLength = buttonWidth * civChoices.length + buttonSpacing * (civChoices.length - 1);
	let borderLeft = CIV_CHOICE_ROW_LEFT + (rowWidth - buttonsLength) / 2;

	if (borderLeft < CIV_CHOICE_ROW_LEFT)
		borderLeft = CIV_CHOICE_ROW_LEFT;

	// Must be done here to correctly initialise the battalion helth bars
	Engine.GuiInterfaceCall("ApplyInitBattalions");
	let battalionsToAdd = Engine.GuiInterfaceCall("GetBattalionsToAdd");
	let battalionsToUpdate = Engine.GuiInterfaceCall("GetBattalionstoUpdate");
	let battalionsToDelete = Engine.GuiInterfaceCall("GetBattalionsToDelete");
	
	UpdateBattalionList(battalionsToAdd, battalionsToUpdate, battalionsToDelete);
	Engine.GuiInterfaceCall("SetBattalionListClean");

	// Determine how many heroes can be chosen
	let heroSettings = readHeroSettings();
	let heroesPerFaction = determineHeroesPerFaction (heroSettings);
	if (heroesPerFaction == 0){
		civChoicesDialogPanel.hidden = true;
		allowHeroSelectionDuringMatch = false;
		Engine.GetGUIObjectByName("showHeroSelectionDuringGameButton").hidden = true;

		return;
	}
	if (heroesPerFaction > civChoices.length){
		heroesPerFaction = civChoices.length;
	}
	
	// Code for the Hero Confirm Button
	let heroConfirmButton = Engine.GetGUIObjectByName("heroConfirm");
	let heroConfirmIcon = Engine.GetGUIObjectByName("heroConfirmIcon");
    heroConfirmIcon.sprite = "stretched:grayscale:session/portraits/technologies/confirm_heroes.png";
    
    // Display the maximum allowed amount of heroes
    //updateHeroCountDisplay(heroesPerFaction);
    
    let heroSeelctionIsValid = false;
    heroConfirmButton.onPress = function ()
    {
		if (heroSeelctionIsValid){
			activateSelectedHeroes();
			Engine.GetGUIObjectByName("civChoicesDialogPanel").hidden = true;
		}
    }
    
    if (allowHeroSelectionDuringMatch){
		removeGrayscale(heroConfirmIcon);
		heroSeelctionIsValid = true;
		Engine.GetGUIObjectByName("showHeroSelectionDuringGameButton").hidden = false;
	} else {
		Engine.GetGUIObjectByName("showHeroSelectionDuringGameButton").hidden = true;
	}
	
	// Create the buttons 
	for (let i = 0; i < civChoices.length; ++i)
	{
		let civChoiceTechData = GetTechnologyData(civChoices[i], currentPlayer.civ);
		let civChoiceButton = Engine.GetGUIObjectByName("civChoice[" + i + "]");
        civChoiceButton.caption = civChoiceTechData.name.generic;

        let size = civChoiceButton.size;
		size.rleft = borderLeft + i * (buttonWidth + buttonSpacing);
		size.rright = size.rleft + buttonWidth;
		size.rtop = borderTop;
		size.rbottom = size.rtop + buttonHeight;
		civChoiceButton.size = size;

		let civChoiceIcon = Engine.GetGUIObjectByName("civChoiceIcon[" + i + "]");
        civChoiceIcon.sprite = "stretched:session/portraits/" + civChoiceTechData.icon;
		let civChoiceIconSelectionOverlay = Engine.GetGUIObjectByName("civChoiceIconSelectionOverlay[" + i + "]");
		
		setupHeroDescriptionWindow(i, civChoiceTechData);
        
		civChoiceButton.onPress = (function(tech, listIndex) { return function() {
			
			// Toggle the heroes
			if (heroIsAlreadySelected(tech)){
				toggleHero(tech);
				civChoiceIconSelectionOverlay.hidden = true;
			}else{
				if (selectedHeroes.length + activatedHeroes.size >= heroesPerFaction)
					clearPendingHeroSelection(civChoices.length);

				if ((selectedHeroes.length + activatedHeroes.size) < heroesPerFaction){
					selectedHeroes.push(tech);
					civChoiceIconSelectionOverlay.hidden = false;
				}
			}
			
			if (!allowHeroSelectionDuringMatch){
				// Activate the confirm hero button if needed
				if (selectedHeroes.length >= heroesPerFaction){
					removeGrayscale(heroConfirmIcon);
					heroSeelctionIsValid = true;
				}else{
					setGrayscale(heroConfirmIcon);
					heroSeelctionIsValid = false;
				}
			}
			
			
			for (let j = 0; j < civChoices.length; ++j){
				Engine.GetGUIObjectByName("heroDescriptionArea[" + j + "]").hidden = true;
			}
			Engine.GetGUIObjectByName("heroDescriptionArea[" + listIndex + "]").hidden = false;
			
			//updateHeroCountDisplay(heroesPerFaction);
			
			
		}})(civChoices[i], i);
		
		civChoiceButton.onPressRight = (function(tech, listIndex) { return function() {
			for (let j = 0; j < civChoices.length; ++j){
				Engine.GetGUIObjectByName("heroDescriptionArea[" + j + "]").hidden = true;
			}
			Engine.GetGUIObjectByName("heroDescriptionArea[" + listIndex + "]").hidden = false;
		}})(civChoices[i], i);


		civChoiceButton.hidden = false;
	}
	
	civChoicesDialogPanel.hidden = false;
}

function resetCivChoiceSlots()
{
	selectedHeroes = [];

	for (let i = 0; i < MAX_CIV_CHOICE_BUTTONS; ++i)
	{
		let civChoiceButton = Engine.GetGUIObjectByName("civChoice[" + i + "]");
		civChoiceButton.hidden = true;
		civChoiceButton.caption = "";
		civChoiceButton.onPress = function() {};
		civChoiceButton.onPressRight = function() {};

		let civChoiceIcon = Engine.GetGUIObjectByName("civChoiceIcon[" + i + "]");
		civChoiceIcon.sprite = "";

		let civChoiceIconSelectionOverlay = Engine.GetGUIObjectByName("civChoiceIconSelectionOverlay[" + i + "]");
		civChoiceIconSelectionOverlay.hidden = true;

		let heroDescriptionArea = Engine.GetGUIObjectByName("heroDescriptionArea[" + i + "]");
		heroDescriptionArea.hidden = true;

		for (let j = 0; j < 5; ++j)
		{
			let heroDescriptionElement = Engine.GetGUIObjectByName("heroDescriptionElement[" + i + "]" + "[" + j + "]");
			heroDescriptionElement.hidden = true;
			heroDescriptionElement.tooltip = "";

			Engine.GetGUIObjectByName("heroDescriptionIcon[" + i + "]" + "[" + j + "]").sprite = "";
			Engine.GetGUIObjectByName("heroDescriptionShortText[" + i + "]" + "[" + j + "]").caption = "";
		}
	}
}

function clearPendingHeroSelection(choiceCount)
{
	selectedHeroes = [];
	for (let i = 0; i < choiceCount; ++i)
		Engine.GetGUIObjectByName("civChoiceIconSelectionOverlay[" + i + "]").hidden = true;
}

function readHeroSettings() {
	let heroSettings = Engine.GuiInterfaceCall("GetHeroeSettings");
	return heroSettings;
}

function setupHeroDescriptionWindow (listIndex, civChoiceTechData)
{
	let heroDescription = civChoiceTechData.heroSelectionDescriptionElements;
	if (!heroDescription){
		return;
	}
	
	let descriptionElementBorderTop = 6;
	let descriptionElementHeight = 15;
	let descriptionElementSpacing = 3;
	
	let numberOfLines = heroDescription.length;
	if (numberOfLines > 5){
		numberOfLines = 5;
	}
	
	for (let i = 0; i < numberOfLines; i++){
		let iconPath = heroDescription[i].icon;
		let shortDescription = heroDescription[i].shortDescription;
		let tooltipText = heroDescription[i].tooltipText;
		
		let heroDescriptionElement = Engine.GetGUIObjectByName("heroDescriptionElement[" + listIndex + "]" + "[" + i + "]");
		let size = heroDescriptionElement.size;
		size.rtop = descriptionElementBorderTop + ((descriptionElementHeight + descriptionElementSpacing) * i);
		size.rbottom = size.rtop + descriptionElementHeight;
		size.rleft = 4;
		size.rright = 65;
		heroDescriptionElement.size = size;
		
		//~ let heroDescriptionButton = Engine.GetGUIObjectByName("heroDescriptionButton[" + listIndex + "]" + "[" + i + "]");
		let heroDescriptionIcon = Engine.GetGUIObjectByName("heroDescriptionIcon[" + listIndex + "]" + "[" + i + "]");
		heroDescriptionIcon.sprite = "stretched:" + iconPath;
		let iconSize = heroDescriptionIcon.size;
		iconSize.rleft = 0;
		iconSize.rright = 12;
		iconSize.rtop = -28;
		iconSize.rbottom = 128;
		heroDescriptionIcon.size = iconSize;
		
		let heroDescriptionShortText = Engine.GetGUIObjectByName("heroDescriptionShortText[" + listIndex + "]" + "[" + i + "]");
		heroDescriptionShortText.caption = shortDescription;
		let textSize = heroDescriptionShortText.size;
		textSize.rleft = 14;
		textSize.rright = 100;
		heroDescriptionShortText.size = textSize;
		
		heroDescriptionElement.tooltip = tooltipText;
		heroDescriptionElement.hidden = false;
	}
	
	let heroDescriptionArea = Engine.GetGUIObjectByName("heroDescriptionArea[" + listIndex + "]");
	let areaSize = heroDescriptionArea.size;
	areaSize.rleft = 27;
	areaSize.rright = 95;
	areaSize.rtop = 43;
	areaSize.rbottom = 65;
	heroDescriptionArea.size = areaSize;
	heroDescriptionArea.hidden = true;
}

function updateHeroCountDisplay(heroesPerFaction)
{
	let heroSelectionSelectedHeroesCount = Engine.GetGUIObjectByName("heroSelectionSelectedHeroesCount");
    heroSelectionSelectedHeroesCount.caption = heroesPerFaction;
	
	(selectedHeroes.length + activatedHeroes.size)
	
	heroSelectionSelectedHeroesCount.caption = ((selectedHeroes.length + activatedHeroes.size) + "/" + heroesPerFaction);
}

function removeGrayscale(icon){
	let iconState = icon.sprite.split(":");
	if (iconState[1] == "grayscale") {
		icon.sprite = iconState[0] + ":" + iconState[2];
	}
}

function setGrayscale(icon){
	let iconState = icon.sprite.split(":");
	if (iconState[1] != "grayscale") {
		icon.sprite = iconState[0] + ":grayscale:" + iconState[1];
	}
}

function toggleHero(tech)
{
	let index = selectedHeroes.indexOf(tech);
	if (index > -1) {
		selectedHeroes.splice(index, 1);
	} else {
		selectedHeroes.push(tech);
	}
}

function heroIsAlreadySelected(tech){
	return selectedHeroes.indexOf(tech) >-1;
}

function activateSelectedHeroes()
{
	for (let i = 0; i < selectedHeroes.length; i++){
		Engine.PostNetworkCommand({ "type": "civ-choice", "template": selectedHeroes[i] });
		
		activatedHeroes.add(selectedHeroes[i]);
	}
	selectedHeroes = new Array();
	disableActivatedHeroButtons();
}

function disableActivatedHeroButtons ()
{
	let currentPlayer = g_Players[g_ViewedPlayer];
	let civChoices = g_CivData[currentPlayer.civ].CivChoices;
	
	for (let i = 0; i < civChoices.length; i++){
		if (activatedHeroes.has(civChoices[i])){
			let civChoiceButton = Engine.GetGUIObjectByName("civChoice[" + i + "]");
			let civChoiceIcon = Engine.GetGUIObjectByName("civChoiceIcon[" + i + "]");
			let civChoiceIconSelectionOverlay = Engine.GetGUIObjectByName("civChoiceIconSelectionOverlay[" + i + "]");
			setGrayscale(civChoiceIcon);
			civChoiceButton.onPress = function () {};
			civChoiceIconSelectionOverlay.hidden = true;
		}
	}
}

// HC-TODO - Update function to work with the new UI code and not use g_GameAttributes as it does not exist any longer
function determineHeroesPerFaction (heroSettings)
{	
	let heroesPerFaction = HEROES_PER_FACTION;

	if (heroSettings.disableHeroes){
		return 0;
	}

	if (heroSettings.heroCount){
		heroesPerFaction = heroSettings.heroCount
	}
	if (heroSettings.allowHeroSelectionDuringMatch){
		allowHeroSelectionDuringMatch = heroSettings.allowHeroSelectionDuringMatch;
	}

	return heroesPerFaction;
}

function ToggleHeroSelectionDuringGame()
{
	if (!allowHeroSelectionDuringMatch){
		return;
	}
	
	let	civChoicesDialogHidden = Engine.GetGUIObjectByName("civChoicesDialogPanel").hidden;
	if (civChoicesDialogHidden){
		Engine.GetGUIObjectByName("civChoicesDialogPanel").hidden = false;
	} else {
		Engine.GetGUIObjectByName("civChoicesDialogPanel").hidden = true;
		let currentPlayer = g_Players[g_ViewedPlayer];
		let civChoices = g_CivData[currentPlayer.civ].CivChoices;
		for (let i = 0; i < civChoices.length; i++){
			Engine.GetGUIObjectByName("civChoiceIconSelectionOverlay[" + i + "]").hidden = true;
		}
		selectedHeroes = new Array();
	}
	
}
