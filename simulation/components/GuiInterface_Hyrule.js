GuiInterface.prototype.InitHyrule = function()
{
	this.battalionsAdded = new Map();
	this.battalionsUpdated = new Map();
	this.battalionsDeleted = new Map();
	this.battalionOrders = new Array();
	this.battalionListDirty = new Array();
	this.initBattalions = new Array();
}


// Functions for the Battalion UI
GuiInterface.prototype.OnBattalionAdded = function (msg)
{
	let playerID = msg.player; // We don't care about Gaia as it has no UI
	if (!playerID > 0){
		return;
	}

	if (!this.battalionsAdded.get(playerID)){
		this.battalionsAdded.set(playerID, new Array());
	}

	let cmpIdentity = Engine.QueryInterface(msg.entities[0], IID_Identity);
	if (cmpIdentity){
		let entityClasses = cmpIdentity.GetClassesList();

		if (MatchesClassList(entityClasses, "Resource Animal Wall HiddenUI")){
			return;
		}
	}

	// Do not add plots to the UI
	let cmpPlots = Engine.QueryInterface(msg.entities[0], IID_Plots);
	if (cmpPlots && cmpPlots.isPlot){
		return;
	}

	let isStructure = false;
	if (this.IsBattalionAStructure(msg.entities)){
		isStructure = true;
	}

	let maxBattalionSize = this.GetBattalionMaxNumberOfEntities(msg.entities[0]);
	let maxHealthPerEntity = this.GetMaxHealthOfBattalionEntities(msg.entities[0]);

	let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	let templateName = cmpTemplateManager.GetCurrentTemplateName(msg.entities[0]);
	let unitTemplateData = this.GetTemplateData(playerID, {"templateName": templateName});
	let battalionIcon = unitTemplateData.icon;

	let battalionData = new Object();
	battalionData.entities = msg.entities;
	battalionData.battalionID = msg.id;
	battalionData.battalionIcon = battalionIcon;
	battalionData.isStructure = isStructure;
	battalionData.isCivilian = this.IsBattalionACivilianBattalion(msg.entities);
	battalionData.maxBattalionHealth = (maxBattalionSize * maxHealthPerEntity);
	battalionData.currentBattalionHealth = this.CalculateCurrentBattalionHealth(msg.entities, battalionData.maxBattalionHealth);

	this.battalionsAdded.get(playerID).push(battalionData);
	this.battalionListDirty[playerID] = true;
}

// This message is sent whenever an entity in a battalion changes/dies or the battalion is deleted completely
GuiInterface.prototype.OnBattalionUpdate = function (msg)
{
	let playerID = msg.player; // We don't care about Gaia as it has no UI
	if (!playerID > 0){
		return;
	}

	if (msg.data){
		let cmpIdentity = Engine.QueryInterface(msg.data[0], IID_Identity);
		if (cmpIdentity){
			let entityClasses = cmpIdentity.GetClassesList();
			if (MatchesClassList(entityClasses, "Resource Animal Wall HiddenUI")){
				return;
			}
		}
	}
	if (msg.delete){
		this.ProcessBattalionDeleted (msg);
	} else{
		this.ProcessBattalionUpdated (msg);
	}

	this.battalionListDirty[playerID] = true;
}

GuiInterface.prototype.ProcessHealthChanged = function (playerID, entity, hitpoints)
{
	if (!playerID > 0){
		return;
	}
	if (hitpoints <= 0){
		return;
	}
	if (this.IsBattalionAStructure([entity])){
		return;
	}

	let cmpIdentity = Engine.QueryInterface(entity, IID_Identity);
	if (cmpIdentity){
		let entityClasses = cmpIdentity.GetClassesList();

		if (MatchesClassList(entityClasses, "Resource Animal Wall HiddenUI")){
			return;
		}
	}

	let cmpBattalion = Engine.QueryInterface(entity, IID_Battalion);
	if (!cmpBattalion){
		return;
	}
	let cmpPlayer = QueryOwnerInterface(entity);

	let battalionID = cmpBattalion.ownBattalionID;
	let battalionEntities = cmpPlayer.GetBattalion(battalionID);
	if (!battalionEntities){
		return;
	}

	let msg = new Object();
	msg.player = playerID;
	msg.data = battalionEntities;
	msg.id = battalionID;

	this.ProcessBattalionUpdated(msg);

	this.battalionListDirty[playerID] = true;
}

GuiInterface.prototype.ProcessBattalionUpdated = function (msg)
{
	let playerID = msg.player;
	if (!this.battalionsUpdated.get(playerID)){
		this.battalionsUpdated.set(playerID, new Array());
	}

	// If something upgrades into a plot we do not want to remove that battalion from the UI
	let cmpPlots = Engine.QueryInterface(msg.data[0], IID_Plots);
	if (cmpPlots && cmpPlots.isPlot){
		this.ProcessBattalionDeleted(msg);
		return;
	}

	let maxBattalionSize = this.GetBattalionMaxNumberOfEntities(msg.data[0]);
	let maxHealthPerEntity = this.GetMaxHealthOfBattalionEntities(msg.data[0]);
	let isStructure = false;
	if (this.IsBattalionAStructure(msg.data)){
		isStructure = true;
	}

	let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	let templateName = cmpTemplateManager.GetCurrentTemplateName(msg.data[0]);
	let template = cmpTemplateManager.GetTemplate(removeFiltersFromTemplateName(templateName));
	let unitTemplateData = this.GetTemplateData(playerID, {"templateName": templateName});
	let battalionIcon = unitTemplateData.icon;

	let battalionData = new Object();
	battalionData.entities = msg.data;  // All entities of the battalion
	battalionData.battalionID = msg.id;
	battalionData.isStructure = isStructure;
	battalionData.template = template;
	battalionData.battalionIcon = battalionIcon;
	battalionData.isCivilian = this.IsBattalionACivilianBattalion(battalionData.entities);
	battalionData.maxBattalionHealth = (maxBattalionSize * maxHealthPerEntity);
	battalionData.currentBattalionHealth = this.CalculateCurrentBattalionHealth(battalionData.entities, battalionData.maxBattalionHealth);

	this.battalionsUpdated.get(playerID).push(battalionData);
}

GuiInterface.prototype.ProcessBattalionDeleted = function (msg)
{
	let playerID = msg.player;
	if (!this.battalionsDeleted.get(playerID)){
		this.battalionsDeleted.set(playerID, new Array());
	}

	let battalionData = new Object();
	battalionData.battalionID = msg.id;
	battalionData.isCivilian = undefined;
	battalionData.isStructure = undefined;
	this.battalionsDeleted.get(playerID).push(battalionData);
}

GuiInterface.prototype.UpdateBattalionOrders = function (playerID, battalionOrders)
{
	this.battalionOrders[playerID] = new Map();
	this.battalionOrders[playerID] = battalionOrders;
	this.battalionListDirty[playerID] = true;
}

GuiInterface.prototype.GetBattalionInformationFromEntityId = function (player, entityID)
{
	let battalionData = new Object();

	let cmpBattalion = Engine.QueryInterface(entityID, IID_Battalion);
	if (!cmpBattalion){
		return null;
	}

	battalionData.battalionID = cmpBattalion.ownBattalionID;
	if (battalionData.battalionID < 0){
		return null;
	}
	let cmpPlayer = QueryOwnerInterface(entityID, IID_Player);
	battalionData.entities = cmpPlayer.GetBattalion(battalionData.battalionID);
	battalionData.playerID = cmpPlayer.playerID;

	return battalionData;
}

GuiInterface.prototype.ApplyInitBattalions = function ()
{
	for(let battalionData of this.initBattalions){
		this.ProcessBattalionUpdated(battalionData);
	}
}

// Helper function. Can not be called from UI
GuiInterface.prototype.IsBattalionACivilianBattalion = function (battalionEntities)
{
	if (!battalionEntities){
		return false;
	}

	let cmpIdentity = Engine.QueryInterface(battalionEntities[0], IID_Identity);
	if (cmpIdentity){
		let entityClasses = cmpIdentity.GetClassesList();

		if (MatchesClassList(entityClasses, "Worker Trader House Economic")){
			return true;
		}
	}
	return false;
}

GuiInterface.prototype.GetPlayerCiv = function (playerID)
{
	if (playerID == -1){
		return "spectator";
	}
	
	let cmpPlayer = QueryPlayerIDInterface(playerID, IID_Player);
	return cmpPlayer.GetCiv();
}

// Helper function. Can not be called from UI
GuiInterface.prototype.GetBattalionMaxNumberOfEntities = function (entity)
{
	let cmpBattalion = Engine.QueryInterface(entity, IID_Battalion);
	return cmpBattalion.GetBattalionSize();
}

// Helper function. Can not be called from UI
GuiInterface.prototype.GetMaxHealthOfBattalionEntities = function (entity)
{
	let cmpHealth = Engine.QueryInterface(entity, IID_Health);
	if (!cmpHealth){
		return 0;
	}
	return cmpHealth.GetMaxHitpoints();
}

// Helper function. Can not be called from UI
GuiInterface.prototype.CalculateCurrentBattalionHealth = function (battalionEntities, maxBattalionHealth)
{
	let currentBattalionHealth = 0;
	for(let entity of battalionEntities){
		let cmpHealth = Engine.QueryInterface(entity, IID_Health);
		if (!cmpHealth){
			continue;
		}
		currentBattalionHealth += cmpHealth.GetHitpoints();
	}
	if (currentBattalionHealth > maxBattalionHealth){
		currentBattalionHealth = maxBattalionHealth;
	}

	return currentBattalionHealth;
}

// Helper function. Can not be called from UI
GuiInterface.prototype.AddInitBattalion = function (playerID, entity, battalionID)
{
	if (!playerID > 0){
		return;
	}
	if (this.IsBattalionAStructure([entity])){
		return;
	}

	let cmpBattalion = Engine.QueryInterface(entity, IID_Battalion);
	if (!cmpBattalion){
		return;
	}
	let cmpPlayer = QueryOwnerInterface(entity);

	let battalionEntities = cmpPlayer.GetBattalion(battalionID);

	let msg = new Object();
	msg.player = playerID;
	msg.data = battalionEntities;
	msg.id = battalionID;

	this.initBattalions.push(msg);
}

// Helper function. Can not be called from UI
GuiInterface.prototype.IsBattalionAStructure = function (battalionEntities)
{
	if (!battalionEntities){
		return false;
	}

	let cmpIdentity = Engine.QueryInterface(battalionEntities[0], IID_Identity);
	if (cmpIdentity){
		let entityClasses = cmpIdentity.GetClassesList();

		if (MatchesClassList(entityClasses, "Structure")){
			return true;
		}
	}
	return false;
}

GuiInterface.prototype.IsBattalionListDirty = function (player)
{
	return this.battalionListDirty[player] || false;
}

GuiInterface.prototype.SetBattalionListClean = function (player)
{
	this.battalionListDirty[player] = false;
	this.battalionsAdded = new Map();
	this.battalionsUpdated = new Map();
	this.battalionsDeleted = new Map();
}

GuiInterface.prototype.GetBattalionsToAdd = function (player)
{
	return this.battalionsAdded;
}

GuiInterface.prototype.GetBattalionsToDelete = function (player)
{
	return this.battalionsDeleted;
}

GuiInterface.prototype.GetBattalionstoUpdate = function (player)
{
	return this.battalionsUpdated;
}

GuiInterface.prototype.GetFreeBattalionSlots = function (player)
{
	if (player == -1){
		player = 0;
	}
	let cmpPlayer = QueryPlayerIDInterface(player);
	return cmpPlayer.GetPopulationLimit() - cmpPlayer.GetPopulationCount();
}

GuiInterface.prototype.GetBattalionOrders = function (player)
{
	if ((player >0) && !this.battalionOrders[player]){
		return undefined;
	}
	return this.battalionOrders;
}

GuiInterface.prototype.GetEntityTemplate = function(player, ent)
{
	let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	let template = cmpTemplateManager.GetCurrentTemplateName(ent);
	return template;
}

GuiInterface.prototype.UpdateCurrentFairySeason = function(player, season)
{
	let cmpPlayer = QueryPlayerIDInterface(player, IID_Player);
	cmpPlayer.fairySeasonCurrent = season;
}
