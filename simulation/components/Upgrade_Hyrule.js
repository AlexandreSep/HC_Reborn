/**
 * Hyrule has some hidden upgrades, because displaying them all would be bad.
 * @param {object} option
 * @param {object} choice
 */
Upgrade.prototype.IsHiddenUpgrade = function (option, choice)
{
	let cmpPlayer = QueryOwnerInterface(this.entity);
	if (!cmpPlayer)
		return false;

	let cmpTechnologyManager = QueryPlayerIDInterface(cmpPlayer.playerID, IID_TechnologyManager);
	if (!cmpTechnologyManager)
		return false;

	let requiredTechnology = this.GetRequiredTechnology(option);
	if (!requiredTechnology || cmpTechnologyManager.IsTechnologyResearched(requiredTechnology))
		return false;

	return choice.HideIfTechnologyRequirementIsNotMet;
}

Upgrade.prototype.CheckPlotInvolvement = function (cmpPlotsOld, newEntity, keepPlots, oldEntity)
{
	let cmpPlotsNew = Engine.QueryInterface(newEntity, IID_Plots);

	if (cmpPlotsNew)
	{
		if (cmpPlotsNew.allPlots.length > 0) // spawning new plots before carrying the old ones over to prevent spawning the old plots again
			cmpPlotsNew.SpawnPlots(Engine.QueryInterface(newEntity, IID_Position).GetRotation(), this.owner); // spawn any plots stated for the new entity if applicable
	}

	// If a building that spawns plots can be upgraded into another building
	if (keepPlots != undefined) // returret and carry over data to the new upgraded version if plots are being carried over
	{
		cmpPlotsNew.plotOwner = this.owner; // if the new entity doesnt spawn its own plots it requires a manual set of the original plotowner for respawning plots
		for (let plotData of cmpPlotsOld.allPlots)
		{
			cmpPlotsNew.allPlots.push(plotData); // push data rather than setting because there might already be a few in the current list
			let cmpPosition = Engine.QueryInterface(plotData.id, IID_Position);
			let cmpPlots = Engine.QueryInterface(plotData.id, IID_Plots);
			cmpPlots.originID = newEntity; // set the origin ID to the new hub for all plots
			cmpPlotsNew.plotsHaveSpawned = true; // set this to true to make sure it goes through the destroy phase when necessary
			cmpPosition.SetTurretParent(newEntity, cmpPlots.plotOffset); // returret to the new upgrade
		}
	}

	// if this entity is a plot related building, transfer the data over to the new upgraded entity
	if (cmpPlotsOld.plotTemplate != null)
	{
		cmpPlotsNew.plotTemplate = cmpPlotsOld.plotTemplate;
		cmpPlotsNew.originID = cmpPlotsOld.originID;
		cmpPlotsNew.plotOffset = cmpPlotsOld.plotOffset;

		// make sure to returret the upgraded object to the plot hub (important for keeping plots as ChangeEntityTemplate will remove all turreted components as well)
		let cmpPosition = Engine.QueryInterface(newEntity, IID_Position);
		cmpPosition.SetTurretParent(cmpPlotsNew.originID, cmpPlotsNew.plotOffset);

		let cmpPlotsOrigin = Engine.QueryInterface(cmpPlotsNew.originID, IID_Plots);

		// tell the core which plot was just upgraded and replace it with the new upgraded ID
		for (let plot of cmpPlotsOrigin.allPlots)
		{
			if (plot.id == oldEntity)
			{
				plot.id = newEntity;
				break;
			}
		}
	}
}

Upgrade.prototype.CheckIntervalSpawnInvolvement = function (cmpHealthOld, newEntity)
{
	if (!cmpHealthOld)
	{
		return;
	}
	if (cmpHealthOld.intervalSpawnInfo == undefined) // if the old entity had a list of spawned units, carry over to the new version
		return;

	let newCmpHealth = Engine.QueryInterface(newEntity, IID_Health);
	newCmpHealth.intervalSpawnedEntities = []; // initialize the entity list here since it doesnt exist in the health component yet
	for (let ent of cmpHealthOld.intervalSpawnedEntities)
	{
		newCmpHealth.intervalSpawnedEntities.push(ent); // push the entity from the old list into the new one
		let cmpHealth = Engine.QueryInterface(ent, IID_Health);
		cmpHealth.intervalSpawnHolderID = newEntity; // inform the spawned entity of its new owner
	}
};

// finish spawn operations if the entity in question was in the process of spawning units
Upgrade.prototype.CheckProductionSpawningState = function (oldEntity)
{
	let cmpProductionQueue = Engine.QueryInterface(oldEntity, IID_ProductionQueue);
	if (cmpProductionQueue && cmpProductionQueue.IsSpawning == true)
	{
		cmpProductionQueue.IsDestroyed = true;
		for (let data of cmpProductionQueue.SpawnData.values())
			cmpProductionQueue.FinishSpawnOperations(data);
	}
};

// Function to upgrade plots that are attached to an formerly upgraded building
Upgrade.prototype.UpgradeAttachedPlotsIfSpecified = function (newEntity, templateToUpgradeTo)
{
	let upgradeTemplateName = this.upgradeTemplates[templateToUpgradeTo];
	let upgradeTemplate = this.template[upgradeTemplateName];
	let plotClassesToUpgrade = upgradeTemplate["UpgradePlots"];

	if (!plotClassesToUpgrade)
	{
		return;
	}

	// Contains the code for the upgrade
	// It needs to be done in the Plots component, as we can not be sure that the target entity conteins an Upgrade Component
	let cmpPlots = Engine.QueryInterface(newEntity, IID_Plots);
	cmpPlots.UpgradePlotsOfEntity(templateToUpgradeTo, plotClassesToUpgrade);

}

// We need to set the fairy civil center to the right season
// Else Nodes will always upgrade to spring
Upgrade.prototype.ChangeFairyCivilCentreToTheRightSeason = function (oldEntity)
{
	let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	let cmpPlayer = QueryOwnerInterface(oldEntity);
	let playerCiv = cmpPlayer.GetCiv();

	let templateOld = cmpTemplateManager.GetCurrentTemplateName(oldEntity);
	if ((playerCiv == "fairy") && (-1 != templateOld.indexOf("node")))
	{
		this.upgrading = "structures/fairy/fairy_wishingwell_" + cmpPlayer.GetCurrentFairySeason();
	}
}

/**
 * Modified function by Hyrule to manage seasons for fairies.
 * @param {string} newTemplate - the template the unit should upgrade to.
 * @return {number} -  the new entity id.
 */
Upgrade.prototype.UpgradeProgressHyrule = function (newTemplate)
{
	// save the old entity
	let oldEntity = this.entity; // This is the plot, not the main building that contains the plots
	let cmpHealthOld = Engine.QueryInterface(oldEntity, IID_Health);
	let cmpPlotsOld = Engine.QueryInterface(oldEntity, IID_Plots);
	let cmpBattalionOld = Engine.QueryInterface(oldEntity, IID_Battalion);
	let cmpPlayerOld = QueryOwnerInterface(oldEntity);

	let name = this.upgradeTemplates[this.upgrading]; // the name set inside the template for this option
	let keepPlots = this.template[name].KeepPlots;
	if (cmpPlotsOld)
	{
		if (cmpPlotsOld.allPlots.length > 0 && keepPlots != undefined) // unturret plots if they have to be carried over to the new upgrade
		{
			for (let plot of cmpPlotsOld.allPlots)
			{
				let cmpPosition = Engine.QueryInterface(plot.id, IID_Position);
				cmpPosition.SetTurretParent(INVALID_ENTITY, new Vector3D()); // will have to unturret the plots before the current hub is destroyed to prevent errors
			}
		}
	}

	this.ChangeFairyCivilCentreToTheRightSeason(oldEntity);
	let newEntity = ChangeEntityTemplate(this.entity, this.upgrading); // change old to new entity

	if (cmpPlotsOld)
	{
		this.CheckPlotInvolvement(cmpPlotsOld, newEntity, keepPlots, oldEntity); // check and update the plot system if present for this upgrade transition
	}
	this.CheckIntervalSpawnInvolvement(cmpHealthOld, newEntity); // check and update the interval spawner if present spawner if present for this upgrade
	this.CheckProductionSpawningState(oldEntity); // if the old entity was still spawning units, finish those spawn operations
	QueryPlayerIDInterface(this.owner, IID_Player).ReplaceBattalionEntity(oldEntity, newEntity); // check and replace the old entity with the new entity for the assigned battalion

	let cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
	cmpTrigger.CallEvent("OnUpgradeFinished", { "owner": this.owner, "oldEntity": oldEntity, "newEntity": newEntity }); // make upgrade event possible for the trigger scripts (for maps mostly)


	// After the main entity gets upgraded this function checks if an of the attached plots needs to be upgraded
	this.UpgradeAttachedPlotsIfSpecified(newEntity, newTemplate);

	// Replenish the battalion if specified
	if (this.template[name].ReplenishBattalionAfterUpgrade)
	{
		cmpPlayerOld.ReplenishBattalionToFull(cmpBattalionOld.ownBattalionID);
	}

	return newEntity;
}
