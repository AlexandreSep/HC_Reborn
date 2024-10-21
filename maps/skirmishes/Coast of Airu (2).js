{
    let cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
    cmpTrigger.attackTime = (5 * 60) * 1000; // attack time between every attack
    cmpTrigger.allEntities = []; 
    cmpTrigger.Group1 = [];
    cmpTrigger.Group2 = [];
    cmpTrigger.PatrolEntities = [];
    cmpTrigger.DestX = 0;
    cmpTrigger.DestZ = 0;
    cmpTrigger.MaxX = 1500;
    cmpTrigger.MaxZ = 900;
    cmpTrigger.PatrolCount = 4;
    cmpTrigger.Caves = TriggerHelper.GetPlayerEntitiesByClass(0, "ArachCave");
    cmpTrigger.Boss = TriggerHelper.GetPlayerEntitiesByClass(0, "Boss");
    cmpTrigger.PatrolLocationsX = [820, 820, 780, 780, 770, 770, 810, 810];
    cmpTrigger.PatrolLocationsZ = [920, 880, 880, 920, 140, 180, 180, 140];
    cmpTrigger.DoAfterDelay((8 * 60) * 1000, "TrainUnits", {});
}

Trigger.prototype.TrainUnits = function () {
    this.UpdateList(this.Caves);
    for (let cave of this.Caves)
    {
        let cmpQueue = Engine.QueryInterface(cave, IID_ProductionQueue);
        if (cmpQueue)
        {
            let entitiesList = cmpQueue.GetEntitiesList();
            let rand = randIntInclusive(0, entitiesList.length - 1);
            let count = 0;

            if (rand === 0)
                count = randIntInclusive(4, 6);
            else if (rand === 1)
                count = randIntInclusive(3, 5);
            else
                count = randIntInclusive(2, 4);

            cmpQueue.AddBatch(entitiesList[rand], "unit", +count);
        }
    }

    this.DoAfterDelay(25000, "GatherAndAttack", {});
};

Trigger.prototype.GatherAndAttack = function () {

    let Arachs = TriggerHelper.GetPlayerEntitiesByClass(0, "NeutralArach");
    this.allEntities.length = 0;

    this.UpdateList(Arachs);

    let groupNumber = randIntInclusive(Math.floor(Arachs.length * 0.5), Math.floor(Arachs.length * 0.8));
    this.PatrolEntities = [];
    this.Group1 = [];
    this.Group2 = [];

    for (let arach of Arachs)
    {
        if (this.allEntities.length < groupNumber)
            this.allEntities.push(arach);
        else if (this.PatrolEntities.length < this.PatrolCount)
            this.PatrolEntities.push(arach);
        else
            break;
    }

    for (let entity of this.allEntities)
    {
        if (this.Group1.length < Math.floor(this.allEntities.length * 0.5))
            this.Group1.push(entity);
        else
            this.Group2.push(entity);
    }

    this.DestX = this.MaxX * 0.5;
    this.DestZ = this.MaxZ * 0.5;
    this.SetAIStance("aggressive", this.allEntities);
    this.AttackCommand(this.DestX, this.DestZ, this.allEntities, true);

    this.DoAfterDelay(20000, "MoveUnits", {});
    this.DoAfterDelay(1000, "CheckUnits", {});

    this.UpdateList(this.Boss);
    if (this.Boss.length >= 1)
        this.DoAfterDelay(1000, "BossPatrol1", {});
}

Trigger.prototype.CheckUnits = function () {

    //error("total " + this.allEntities.length + " group 1 " + this.Group1.length + " group2 " + this.Group2.length);

    this.UpdateList(this.allEntities);
    if (this.allEntities < 1)
    {
        this.DoAfterDelay(this.attackTime, "TrainUnits", {});
        return;
    }

    this.DoAfterDelay(1000, "CheckUnits", {});
}

Trigger.prototype.MoveUnits = function ()
{
    this.UpdateList(this.allEntities);
    if (this.allEntities < 1)
        return;

    let structures1 = TriggerHelper.GetPlayerEntitiesByClass(1, "Structure");
    let structures2 = TriggerHelper.GetPlayerEntitiesByClass(2, "Structure");

    this.UpdateList(this.Group1);
    if (structures1.length > 0 && this.Group1.length > 0)
    {
        let rand = randIntInclusive(0, structures1.length - 1);
        let pos = Engine.QueryInterface(structures1[rand], IID_Position).GetPosition2D(); 
        this.AttackCommand(pos.x, pos.y, this.Group1, true);
    }

    this.UpdateList(this.Group2);
    if (structures2.length > 0 && this.Group2.length > 0)
    {
        let rand = randIntInclusive(0, structures2.length - 1);
        let pos = Engine.QueryInterface(structures2[rand], IID_Position).GetPosition2D();
        this.AttackCommand(pos.x, pos.y, this.Group2, true);
    }

    this.DoAfterDelay((2 * 60) * 1000, "MoveUnits", {});
}

Trigger.prototype.BossPatrol1 = function ()
{
    this.UpdateList(this.Boss);
    if (this.Boss.length < 1)
        return;

    this.AttackCommand(800, 900, this.Boss, true);
    this.SetAIStance("defensive", this.PatrolEntities);

    let count = 0;
    this.UpdateList(this.PatrolEntities);
    for (let patrol of this.PatrolEntities)
    {
        this.AttackCommand(this.PatrolLocationsX[count], this.PatrolLocationsZ[count], [patrol], true);
        count += 1;
    }

    this.DoAfterDelay((2 * 60) * 1000, "BossPatrol2", {});
}

Trigger.prototype.BossPatrol2 = function () {

    this.UpdateList(this.Boss);
    if (this.Boss.length < 1)
        return;

    this.AttackCommand(790, 160, this.Boss, true);

    let count = this.PatrolCount;
    this.UpdateList(this.PatrolEntities);
    for (let patrol of this.PatrolEntities)
    {
        this.AttackCommand(this.PatrolLocationsX[count], this.PatrolLocationsZ[count], [patrol], true);
        count += 1;
    }
}

// update a given list by deleting removed game elements from it
Trigger.prototype.UpdateList = function (list)
{
    let removedIndices = [];
    for (let i = 0; i < list.length; i++)
    {
        if (Engine.QueryInterface(list[i], IID_Health) == undefined)
            removedIndices.push(i);
    }
    this.RemoveIndices(removedIndices, list);
}

// update a given list by deleting removed game elements from it
Trigger.prototype.RemoveIndices = function (removedIndices, originList) {
    // while splicing, an element is taken from a list, and every element above it is dropped down by 1 index position
    // this removal system works because the index list provided is always organized from the lowest to the highest index
    // if you take away for example index 8 first, and index 4 afterward, index 4 will be decreased by count and become index 3 instead of 4
    // This is a problem because index 4 actually hasnt been decreased by the removal of index 8, because it only dropped down all elements above index 8 and not below

    let count = 0;
    for (let index of removedIndices)
    {
        let newIndex = +index - +count;
        originList.splice(newIndex, 1);
        count += 1;
    }
}

Trigger.prototype.AttackCommand = function (x, z, entities, queue, type = "attack-walk")
{
    let cmd = [];
    cmd.type = type;
    cmd.x = x;
    cmd.z = z;
    cmd.entities = entities;
    cmd.targetClasses = { "attack": ["Unit", "Structure"] };
    cmd.allowCapture = false;
    cmd.queued = queue;
    ProcessCommand(0, cmd);
}

Trigger.prototype.SetAIStance = function (name, entities, type = "stance")
{
    let cmd = [];
    cmd.type = type;
    cmd.entities = entities;
    cmd.name = name;
    ProcessCommand(0, cmd);
}