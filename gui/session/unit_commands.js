// The number of currently visible buttons (used to optimise showing/hiding)
var g_unitPanelButtons = {
	"Selection": 0,
	"Queue": 0,
	"Formation": 0,
	"Garrison": 0,
	"Training": 0,
	"Research": 0,
	"Alert": 0,
	"Barter": 0,
	"Construction": 0,
	"Command": 0,
	"Stance": 0,
	"Gate": 0,
	"Pack": 0,
	"Upgrade": 0
};

/**
 * Set the position of a panel object according to the index,
 * from left to right, from top to bottom.
 * Will wrap around to subsequent rows if the index
 * is larger than rowLength.
 */
function setPanelObjectPosition(object, index, rowLength, vMargin = 1, hMargin = 1)
{
	var size = object.size;
	// horizontal position
	var oWidth = size.right - size.left;
	var hIndex = index % rowLength;
	size.left = hIndex * (oWidth + vMargin);
	size.right = size.left + oWidth;
	// vertical position
	var oHeight = size.bottom - size.top;
	var vIndex = Math.floor(index / rowLength);
	size.top = vIndex * (oHeight + hMargin);
	size.bottom = size.top + oHeight;
	object.size = size;
}

function getUnitPanelGUIObject(guiName, objectName, index)
{
	return Engine.TryGetGUIObjectByName("unit" + guiName + objectName + "[" + index + "]");
}

function getOptionalUnitPanelGUIObject(guiName, objectName, index)
{
	return getUnitPanelGUIObject(guiName, objectName, index) || {
		"caption": "",
		"hidden": true,
		"sprite": "",
		"tooltip": ""
	};
}

/**
 * Helper function for updateUnitCommands; sets up "unit panels"
 * (i.e. panels with rows of icons) for the currently selected unit.
 *
 * @param guiName Short identifier string of this panel. See g_SelectionPanels.
 * @param unitEntStates Entity states of the selected units
 * @param playerState Player state
 */
function setupUnitPanel(guiName, unitEntStates, playerState)
{
	if (!g_SelectionPanels[guiName])
	{
		error("unknown guiName used '" + guiName + "'");
		return;
	}

	let items = g_SelectionPanels[guiName].getItems(unitEntStates);

	if (!items || !items.length)
		return;

	let numberOfItems = Math.min(items.length, g_SelectionPanels[guiName].getMaxNumberOfItems());
	let rowLength = g_SelectionPanels[guiName].rowLength || 8;

	if (g_SelectionPanels[guiName].resizePanel)
		g_SelectionPanels[guiName].resizePanel(numberOfItems, rowLength);

	for (let i = 0; i < numberOfItems; ++i)
	{
		let data = {
			"i": i,
			"item": items[i],
			"playerState": playerState,
			"player": unitEntStates[0].player,
			"unitEntStates": unitEntStates,
			"rowLength": rowLength,
			"numberOfItems": numberOfItems,
			// depending on the XML, some of the GUI objects may be undefined
			"button": getUnitPanelGUIObject(guiName, "Button", i),
			"icon": getUnitPanelGUIObject(guiName, "Icon", i),
			"guiSelection": getOptionalUnitPanelGUIObject(guiName, "Selection", i),
			"countDisplay": getOptionalUnitPanelGUIObject(guiName, "Count", i)
		};

		if (!data.button || !data.icon)
			continue;

		data.button.hidden = false;
		data.button.enabled = true;
		data.button.tooltip = "";
		data.button.caption = "";

		
		if (g_SelectionPanels[guiName].setupButton &&
		    !g_SelectionPanels[guiName].setupButton(data))
			continue;

		// TODO: we should require all entities to have icons, so this case never occurs
		if (data.icon && !data.icon.sprite)
			data.icon.sprite = "BackgroundBlack";
	}

	// Hide any buttons we're no longer using
	for (let i = numberOfItems; i < g_unitPanelButtons[guiName]; ++i)
		if (g_SelectionPanels[guiName].hideItem)
			g_SelectionPanels[guiName].hideItem(i, rowLength);
		else
		{
			let button = getUnitPanelGUIObject(guiName, "Button", i);
			if (button)
				button.hidden = true;
		}

	g_unitPanelButtons[guiName] = numberOfItems;
	g_SelectionPanels[guiName].used = true;
}

/**
 * Updates the selection panels where buttons are supposed to
 * depend on the context.
 * Runs in the main session loop via updateSelectionDetails().
 * Delegates to setupUnitPanel to set up individual subpanels,
 * appropriately activated depending on the selected unit's state.
 *
 * @param entStates Entity states of the selected units
 * @param supplementalDetailsPanel Reference to the
 *        "supplementalSelectionDetails" GUI Object
 * @param commandsPanel Reference to the "commandsPanel" GUI Object
 */
function updateUnitCommands(entStates, supplementalDetailsPanel, commandsPanel)
{
	for (let panel in g_SelectionPanels)
		g_SelectionPanels[panel].used = false;

	// Get player state to check some constraints
	// e.g. presence of a hero or build limits.
	let playerStates = GetSimState().players;
	let playerState = playerStates[Engine.GetPlayerID()];

	setupUnitPanel("Selection", entStates, playerStates[entStates[0].player]);

	// Command panel always shown for it can contain commands
	// for which the entity does not need to be owned.
	setupUnitPanel("Command", entStates, playerState);

	if (g_IsObserver || entStates.every(entState =>
		controlsPlayer(entState.player) &&
		(!entState.identity || entState.identity.controllable)) ||
		playerState.controlsAll)
	{
		for (let guiName of g_PanelsOrder)
		{
			if (g_SelectionPanels[guiName].conflictsWith &&
			    g_SelectionPanels[guiName].conflictsWith.some(p => g_SelectionPanels[p].used))
				continue;

			setupUnitPanel(guiName, entStates, playerStates[entStates[0].player]);
		}

		supplementalDetailsPanel.hidden = false;
		commandsPanel.hidden = false;
	}
	else if (playerState.isMutualAlly[entStates[0].player]) // owned by allied player
	{
		// TODO if there's a second panel needed for a different player
		// we should consider adding the players list to g_SelectionPanels
		setupUnitPanel("Garrison", entStates, playerState);

		supplementalDetailsPanel.hidden = !g_SelectionPanels.Garrison.used;

		commandsPanel.hidden = true;
	}
	else // owned by another player
	{
		supplementalDetailsPanel.hidden = true;
		commandsPanel.hidden = true;
	}

	// Hides / unhides Unit Panels (panels should be grouped by type, not by order, but we will leave that for another time)
	for (let panelName in g_SelectionPanels)
	{
		let panel = Engine.TryGetGUIObjectByName("unit" + panelName + "Panel");
		if (panel)
			panel.hidden = !g_SelectionPanels[panelName].used;
	}
}

// Force hide commands panels
function hideUnitCommands()
{
	for (var panelName in g_SelectionPanels)
	{
		let panel = Engine.TryGetGUIObjectByName("unit" + panelName + "Panel");
		if (panel)
			panel.hidden = true;
	}
}

// Get all of the available entities which can be trained by the selected entities
function getAllTrainableEntities(selection)
{
	let trainableEnts = [];
	// Get all buildable and trainable entities
	for (let ent of selection)
	{
		let state = GetEntityState(ent);
		if (state?.trainer?.entities?.length)
		{
			if (!state.production)
				warn("Trainer without Production Queue found: " + ent + ".");
			trainableEnts = trainableEnts.concat(state.trainer.entities);
		}
	}

	// Remove duplicates
	removeDupes(trainableEnts);
	return trainableEnts;
}

function getAllTrainableEntitiesFromSelection()
{
	if (!g_allTrainableEntities)
		g_allTrainableEntities = getAllTrainableEntities(g_Selection.toList());

	return g_allTrainableEntities;
}

// Get all of the available entities which can be built by the selected entities
function getAllBuildableEntities(selection)
{
	return Engine.GuiInterfaceCall("GetAllBuildableEntities", { "entities": selection });
}

function getAllBuildableEntitiesFromSelection()
{
	if (!g_allBuildableEntities)
		g_allBuildableEntities = getAllBuildableEntities(g_Selection.toList());

	return g_allBuildableEntities;
}

function getNumberOfRightPanelButtons()
{
	var sum = 0;

	for (let prop of ["Construction", "Training", "Pack", "Gate", "Upgrade"])
		if (g_SelectionPanels[prop].used)
			sum += g_unitPanelButtons[prop];

	return sum;
}
