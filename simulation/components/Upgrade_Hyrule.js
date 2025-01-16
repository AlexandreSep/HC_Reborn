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
			let cmpPlots = Engine.QueryInterface(plotData.id, IID_Plots);
			cmpPlots.originID = newEntity; // set the origin ID to the new hub for all plots
			cmpPlotsNew.plotsHaveSpawned = true; // set this to true to make sure it goes through the destroy phase when necessary
		}
	}

	// if this entity is a plot related building, transfer the data over to the new upgraded entity
	if (cmpPlotsOld.plotTemplate != null)
	{
		cmpPlotsNew.plotTemplate = cmpPlotsOld.plotTemplate;
		cmpPlotsNew.originID = cmpPlotsOld.originID;
		cmpPlotsNew.plotOffset = cmpPlotsOld.plotOffset;

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
		cmpPlotsOrigin.CheckHubInvulnerabilityStatus(); // newly upgraded plot has been assigned to allplots, check for invulnerability
	}
}

// finish spawn operations if the entity in question was in the process of spawning units
Upgrade.prototype.CheckProductionSpawningState = function (oldEntity)
{
	let cmpTrainer = Engine.QueryInterface(oldEntity, IID_Trainer);
	if (cmpTrainer && cmpTrainer.IsSpawning == true)
	{
		cmpTrainer.IsDestroyed = true;
		for (let data of cmpTrainer.AllSpawnData.values())
		cmpTrainer.FinishSpawnOperations(data);
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


// HC-Code
// Fairy season management has been removed.
// We probably don't need to have this function in Upgrade_Hyrule
// Check when upgrading the engine
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

	let newEntity = ChangeEntityTemplate(this.entity, this.upgrading); // change old to new entity

	if (cmpPlotsOld)
	{
		this.CheckPlotInvolvement(cmpPlotsOld, newEntity, keepPlots, oldEntity); // check and update the plot system if present for this upgrade transition
    }

    if (cmpHealthOld)
        cmpHealthOld.CheckIntervalSpawnInvolvement(); // kill or unlink the remaining interval spawned entities if present

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
