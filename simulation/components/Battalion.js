function Battalion() {}

Battalion.prototype.Schema =
    "<element name='Size' a:help='the size of the battalion in number of entities'><ref name='nonNegativeDecimal'/></element>" +
    "<element name='SpawnDeltaTime' a:help='the time between spawning every unit'><ref name='nonNegativeDecimal'/></element>" +
    "<element name='SameActorSeed' a:help=''><data type='boolean'/></element>" +
    "<element name='FormationTemplate' a:help='the template that will be spawned'><text/></element>";

Battalion.prototype.Init = function ()
{
    this.ownBattalionID = -1;
    this.useSameActorSeed = this.template.SameActorSeed != "false";
    this.formationTemplate = this.template.FormationTemplate;
    this.replenishTimer = -1;
    this.actorSeed = -1;
    this.spawnDeltaTime = this.template.SpawnDeltaTime;
    this.customBattalionSize = undefined; // This is set if an entity spawns a battalion on death that shall have a different battalion size than what is standard.
};

Battalion.prototype.SetOwnBattalion = function (battalionID, actorSeed)
{
    this.ownBattalionID = battalionID;
    this.actorSeed = actorSeed;
};

Battalion.prototype.GetBattalionSize = function ()
{
    if (this.customBattalionSize){
        return this.customBattalionSize;
    }
    return ApplyValueModificationsToEntity("Battalion/" + "Size", +this.template.Size, this.entity);
};

Battalion.prototype.UseSameActorSeed = function ()
{
    return this.useSameActorSeed;
};

Battalion.prototype.GetSpawnDeltaTime = function ()
{
    return this.spawnDeltaTime;
};

Battalion.prototype.GetFormationTemplate = function ()
{
    return this.formationTemplate;
};

Battalion.prototype.GetActorSeed = function ()
{
    return this.actorSeed;
};

Battalion.prototype.ReplenishBattalion = function (data, lateness)
{
    let battalionEnts = QueryOwnerInterface(this.entity).GetBattalion(this.ownBattalionID);
    if (battalionEnts.length >= this.GetBattalionSize())
        return;

    for (let ent of battalionEnts)
    {
        if (Engine.QueryInterface(ent, IID_UnitAI).IsIdle() == false)
            return;
    }

    var spawnedEntity = Engine.AddEntity(this.template.SpawnMultipleEntitiesOnDeath.Template);
    var cmpSpawnedPosition = Engine.QueryInterface(spawnedEntity, IID_Position);

    cmpSpawnedPosition.JumpTo(pos.x, pos.z);
    cmpSpawnedPosition.SetYRotation(rot.y);
    cmpSpawnedPosition.SetXZRotation(rot.x, rot.z);

    var cmpSpawnedOwnership = Engine.QueryInterface(spawnedEntity, IID_Ownership);
    let ownerID = this.template.SpawnMultipleEntitiesOnDeath.OwnerID;
    if (ownerID != undefined) {
        if (cmpSpawnedOwnership)
            cmpSpawnedOwnership.SetOwner(+ownerID);
    }
    else {
        if (cmpOwnership && cmpSpawnedOwnership)
            cmpSpawnedOwnership.SetOwner(cmpOwnership.GetOwner());
    }

    // play spawn animation if present
    var spawnedUnitVisualCmp = Engine.QueryInterface(spawnedEntity, IID_Visual);
    spawnedUnitVisualCmp.SelectAnimation("spawn", true, 1.0);

    //play sound if present
    PlaySound("spawn", spawnedEntity);
};

Engine.RegisterComponentType(IID_Battalion, "Battalion", Battalion);
