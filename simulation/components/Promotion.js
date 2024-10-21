function Promotion() {}

Promotion.prototype.Schema =
	"<element name='Entity'>" +
		"<text/>" +
	"</element>" +
	"<optional>" +
		"<element name='TrickleRate' a:help='Trickle of XP gained each second.'>" +
			"<ref name='nonNegativeDecimal'/>" +
		"</element>" +
	"</optional>" +
	"<element name='RequiredXp'>" +
		"<data type='positiveInteger'/>" +
	"</element>";

Promotion.prototype.Init = function()
{
	this.currentXp = 0;
	this.ComputeTrickleRate();
};

Promotion.prototype.GetRequiredXp = function()
{
    let test = ApplyValueModificationsToEntity("Promotion/RequiredXp", +this.template.RequiredXp, this.entity);
    //warn("value " + test + "for ent " + this.entity);
    return test;
};

Promotion.prototype.GetCurrentXp = function()
{
	return this.currentXp;
};

Promotion.prototype.GetPromotedTemplateName = function()
{
	return this.template.Entity;
};

Promotion.prototype.Promote = function(promotedTemplateName)
{
	let cmpHealth = Engine.QueryInterface(this.entity, IID_Health);
	if (cmpHealth && cmpHealth.GetHitpoints() == 0)
	{
		this.promotedUnitEntity = INVALID_ENTITY;
		return;
	}

    ChangeEntityTemplate(this.entity, promotedTemplateName, true);
};

//HC-code functions incoming
// A function that delays the promotion for set miliseconds and then recalls it
Promotion.prototype.RePromote = function (promotedTemplateName, lateness) {
    this.Promote(promotedTemplateName);
};

// finish spawn operations if the entity in question was in the process of spawning units
Promotion.prototype.CheckProductionSpawningState = function (oldEntity) {
    let cmpProductionQueue = Engine.QueryInterface(oldEntity, IID_ProductionQueue);
    if (cmpProductionQueue && cmpProductionQueue.IsSpawning == true) {
        cmpProductionQueue.IsDestroyed = true;
        for (let data of cmpProductionQueue.SpawnData.values())
            cmpProductionQueue.FinishSpawnOperations(data);
    }
};

Promotion.prototype.CheckIntervalSpawnInvolvement = function (oldEntity, newEntity, oldHealth, newHealth) {
    if (oldHealth.intervalSpawnHolderID == null) // check if the entity had an interval spawn holder
        return;

    newHealth.intervalSpawnHolderID = oldHealth.intervalSpawnHolderID; // carry over the owner to the newly promoted entity
    let cmpHolderHealth = Engine.QueryInterface(newHealth.intervalSpawnHolderID, IID_Health);
    let list = cmpHolderHealth.intervalSpawnedEntities; // get the holders list
    for (let i = 0; i < list.length; i++) {
        if (list[i] == oldEntity)
            list[i] = newEntity; // replace the old entity with the newly promoted entity inside the holders spawn list
    }
};

// Only handles involvement of plot related buildings, not yet for plot hubs (Currently only used for the Lizalfos god buildings)
Promotion.prototype.CheckPlotInvolvement = function (cmpHealthOld, newEntity, oldEntity) {
    // if this entity is a plot related building, transfer the data over to the new upgraded entity
    if (cmpHealthOld.plotTemplate != null) {
        let cmpHealthNew = Engine.QueryInterface(newEntity, IID_Health);
        cmpHealthNew.plotTemplate = cmpHealthOld.plotTemplate;
        cmpHealthNew.originID = cmpHealthOld.originID;
        cmpHealthNew.plotOffset = cmpHealthOld.plotOffset;

        // make sure to returret the upgraded object to the plot hub (important for keeping plots as ChangeEntityTemplate will remove all turreted components as well) 
        let cmpPosition = Engine.QueryInterface(newEntity, IID_Position);
        cmpPosition.SetTurretParent(cmpHealthNew.originID, cmpHealthNew.plotOffset);

        let cmpHealthOrigin = Engine.QueryInterface(cmpHealthNew.originID, IID_Health);

        // tell the core which plot was just upgraded and replace it with the new upgraded ID
        for (let plot of cmpHealthOrigin.allPlots) {
            if (plot.id == oldEntity) {
                plot.id = newEntity;
                break;
            }
        }
    }
};
//HC-end

/**
 * @param {number} entity - The entity ID of the entity that this unit has promoted to.
 */
Promotion.prototype.SetPromotedEntity = function(entity)
{
	this.promotedUnitEntity = entity;
};

Promotion.prototype.IncreaseXp = function(amount)
{
	// if the unit was already promoted, but is waiting for the engine to be destroyed
	// transfer the gained xp to the promoted unit if applicable
	if (this.promotedUnitEntity)
	{
		let cmpPromotion = Engine.QueryInterface(this.promotedUnitEntity, IID_Promotion);
		if (cmpPromotion)
			cmpPromotion.IncreaseXp(amount);
		return;
	}

	this.currentXp += +amount;
	let requiredXp = this.GetRequiredXp();

	if (this.currentXp >= requiredXp)
	{
		let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
		let cmpPlayer = QueryOwnerInterface(this.entity, IID_Player);
		if (!cmpPlayer)
			return;

		let playerID = cmpPlayer.GetPlayerID();
		this.currentXp -= requiredXp;
		let promotedTemplateName = this.GetPromotedTemplateName();
		// check if we can upgrade a second time (or even more)
		while (true)
		{
			let template = cmpTemplateManager.GetTemplate(promotedTemplateName);
			if (!template.Promotion)
				break;
			requiredXp = ApplyValueModificationsToTemplate("Promotion/RequiredXp", +template.Promotion.RequiredXp, playerID, template);
			// compare the current xp to the required xp of the promoted entity
			if (this.currentXp < requiredXp)
				break;
			this.currentXp -= requiredXp;
			promotedTemplateName = template.Promotion.Entity;
		}
		this.Promote(promotedTemplateName);
	}

	Engine.PostMessage(this.entity, MT_ExperienceChanged, {});
};

Promotion.prototype.ComputeTrickleRate = function()
{
	this.trickleRate = ApplyValueModificationsToEntity("Promotion/TrickleRate", +(this.template.TrickleRate || 0), this.entity);
	this.CheckTrickleTimer();
};

Promotion.prototype.CheckTrickleTimer = function()
{
	if (!this.trickleRate)
	{
		if (this.trickleTimer)
		{
			let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
			cmpTimer.CancelTimer(this.trickleTimer);
			delete this.trickleTimer;
		}
		return;
	}

	if (this.trickleTimer)
		return;

	let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	this.trickleTimer = cmpTimer.SetInterval(this.entity, IID_Promotion, "TrickleTick", 1000, 1000, null);
};

Promotion.prototype.TrickleTick = function()
{
	this.IncreaseXp(this.trickleRate);
};

Promotion.prototype.OnValueModification = function(msg)
{
	if (msg.component != "Promotion")
		return;

	this.ComputeTrickleRate();
	this.IncreaseXp(0);
};

Engine.RegisterComponentType(IID_Promotion, "Promotion", Promotion);
