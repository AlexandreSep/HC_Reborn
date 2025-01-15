var CONQUESTAI = function (m) {

    /**
     * Headquarters
     * Deal with high level logic for the AI. Most of the interesting stuff gets done here.
     * Some tasks:
     *  -defining RESS needs
     *  -BO decisions.
     *     > training workers
     *     > building stuff (though we'll send that to bases)
     *  -picking strategy (specific manager?)
     *  -diplomacy -> diplomacyManager
     *  -planning attacks -> attackManager
     *  -picking new CC locations.
     */

    //  #############################################################
    //  - INIT
    //  - GATHERERS AND BUILDERS BEHAVIOUR
    //  - CONSTRUCTING & BUILDING QUEUES
    //  - MARKET BEHAVIOUR
    //  - UPGRADING AND TECHS
    //  - HELPER FUNCTIONS
    //  - EVENT CODE
    //  - TRAINING & RECRUITING
    //  - ATTACKING & DEFENDING
    //  #############################################################

    m.HQ = function (Config) {
        this.Config = Config;
        this.phasing = 0;	// existing values: 0 means no, i > 0 means phasing towards phase i

        // Cache various quantities.
        this.turnCache = {};
        this.lastFailedGather = {};

        this.buildManager = new m.BuildManager();
    };

    //  #############################################################
    //  INIT
    //  #############################################################

    /** More initialisation for stuff that needs the gameState */
    m.HQ.prototype.init = function (gameState) {
        this.territoryMap = m.createTerritoryMap(gameState);
        // initialize base map. Each pixel is a base ID, or 0 if not or not accessible
        this.basesMap = new API3.Map(gameState.sharedScript, "territory");
        // create borderMap: flag cells on the border of the map
        // then this map will be completed with our frontier in updateTerritories
        this.borderMap = m.createBorderMap(gameState);
        // list of allowed regions
        this.landRegions = {};
        // try to determine if we have a water map
        this.navalMap = false;
        this.navalRegions = {};

        // declare and initialize all necessary resources required by the code during gameplay
        this.allSupplies = {};
        this.allGatherers = {};
        this.allDropsites = {};
        this.allBuildings = {};
        this.LargeSupplies = { "inside": {}, "outside": {} };
        this.allFoundations = [];
        this.allBuilders = [];
        this.allFarms = [];
        this.allMarkets = [];
        this.allInfluenceEntities = [];
        this.allCivilCentres = [];
        this.ownedTiles = [];
        this.TileOwners = new Map();
        this.justOutOfTerritoryTiles = [];
        this.allDropsites["foundations"] = [];
        this.queuedBuilding = { "path": null, "template": null };
        this.allResourceTypes = [];
        this.blockedResources = [];
        this.currentTradeRoute = []; // used for holding the 2 markets for the updated trade route
        this.difficultyRatio = 1;
        this.checkpointTimeThreshold = 0; // holds the time threshold for when checkpoints should be incremented regardless of distance

        this.assignedTypes = { "food": [], "wood": [], "stone": [], "metal": [], "treasure": [] }; // all specific resource types sorted from highest to lowest gathering speed and per raw type 
        this.resourcePriorityList = ["food", "wood", "stone", "metal"]; // the sorted resource priority list for this AI, will be updated after bartering and trading

        this.allEnemies = gameState.getEnemies();
        this.allAllies = gameState.getAllies();
        this.allEnemyCivilCentres = {};
        this.allEnemySoldiers = {};
        this.soldierState = 0; // universal state of the soldiers 0 = idle, 1 = attacking, 2 = defending
        this.checkpoints = {}; // checkpoints used for attacking locations
        this.currentCheckpoint = 0;
        this.targetedEnemyID = 0;
        this.attackTarget = undefined;
        this.defendingData = new Map(); // { "checkpoint":[0, 0], "target": undefined, "owner": 0 };
        this.allBattalions = new Map(); // contains the battalion ents with the battalionID as key

        this.allUnits = {};
        this.allSoldiers = [];
        this.allCitizens = [];
        this.allTraders = [];
        this.allTrainingFacilities = [];
        this.allHeroes = [];
        this.trainableUnits = { "Citizens": [], "Livestock": [], "Trader": [], "Hero": [], "Titan": [], "Other": []};

        this.loadConfigData(gameState);
        this.loadAIDialogData(gameState);
        this.startStrategyState = 1;
        this.startStrategyFailed = 0;
        this.defaultBan = this.configData["StartStrategyBan"][0];

        this.allNetworks = { "foundations": [], "buildings": [] };

        // this is a bit hacky but prolly the cheapest and currently best way to have quick access to all the resource types
        this.allResourceTypes.push("food.meat");
        this.allResourceTypes.push("food.grain");
        this.allResourceTypes.push("food.fruit");
        this.allResourceTypes.push("food.fish");
        this.allResourceTypes.push("food.rocksirloin");
        this.allResourceTypes.push("wood.tree");
        this.allResourceTypes.push("wood.rock");
        this.allResourceTypes.push("wood.ruins");
        this.allResourceTypes.push("stone.ore");
        this.allResourceTypes.push("stone.ruins");
        this.allResourceTypes.push("stone.coralmold");
        this.allResourceTypes.push("metal.rupees");
        this.allResourceTypes.push("treasure");
        this.allResourceTypes.push("treasure.food");
        this.allResourceTypes.push("treasure.wood");
        this.allResourceTypes.push("treasure.stone");
        this.allResourceTypes.push("treasure.metal");

        for (let resourceType of Resources.GetCodes())
        {
            this.allSupplies[resourceType] = [];
            this.allGatherers[resourceType] = [];
            this.allDropsites[resourceType] = [];
        }

        for (let fullType of this.allResourceTypes)
            this.allSupplies[fullType] = [];

        for (let list in this.LargeSupplies)
        {
            for (let resourceType of Resources.GetCodes())
                this.LargeSupplies[list][resourceType] = [];
        }

        switch (this.Config.difficulty)
        {
            case 4:
                this.difficultyRatio = this.Config.difficultyRatio[0];
                break;
            case 3:
                this.difficultyRatio = this.Config.difficultyRatio[1];
                break;
            case 2:
                this.difficultyRatio = this.Config.difficultyRatio[2];
                break;
            case 1:
                this.difficultyRatio = this.Config.difficultyRatio[3];
                break;
            case 0:
                this.difficultyRatio = this.Config.difficultyRatio[3];
                break;
            default:
                break;
        }
        ////error("difficulty ratio " + this.difficultyRatio);

        // get the resources this faction doesnt want to consider, currently purely based on what the faction citizens can gather 
        let units = gameState.getOwnUnits();
        for (let ent of units.toEntityArray())
        {
            if (ent.hasClass("FemaleCitizen"))
            {
                let gatherRates = ent.resourceGatherRates();
                let possibleTypes = [];
                for (let type in gatherRates)
                    possibleTypes.push(type); // get the list of potential types from the object first

                for (let fullType of this.allResourceTypes) {
                    if (possibleTypes.indexOf(fullType) == -1)
                        this.blockedResources.push(fullType.split(".")[1]); // add the specific type to the blocked list
                }

                this.RefreshSortedResources(gatherRates);
                break;
            }
        }

        gameState.getOwnStructures().forEach(function (ent)
        {
            gameState.ai.HQ.AddTrainableUnits(ent, gameState);
            ent.obstructionMax = ent.obstructionRadius().max;
            let buildingList = gameState.ai.HQ.allBuildings[ent.genericName()];
            if (!buildingList) {
                gameState.ai.HQ.allBuildings[ent.genericName()] = [];
                gameState.ai.HQ.allBuildings[ent.genericName()].push(ent);
            }
            else
                buildingList.push(ent);

            if (ent.hasClass("field"))
                gameState.ai.HQ.allFarms.push(ent);

            if (ent.hasClass("CivilCentre")) {
                gameState.ai.HQ.allCivilCentres.push(ent);
                gameState.ai.HQ.startLocation = ent.position();
            }

            let influence = ent.get("TerritoryInfluence/Radius");
            if (influence)
            {
                if (influence >= 60)
                {
                    gameState.ai.HQ.allInfluenceEntities.push(ent);
                    ent.influence = influence;                   
                }
            }
        });

        for (let enemyID of gameState.ai.HQ.allEnemies)
        {
            gameState.ai.HQ.allEnemyCivilCentres[enemyID] = [];
            gameState.ai.HQ.allEnemySoldiers[enemyID] = [];
            gameState.getEnemyStructures(enemyID).forEach(function (ent)
            {
                if (ent.hasClass("CivilCentre"))
                    gameState.ai.HQ.allEnemyCivilCentres[enemyID].push(ent); // save the civil centers for every enemy player individually
            });
        }

        this.RefreshTileLists();

        // fill the supply table with the content for every resource type (technically 4 lists containing dropsites per resource type)
        gameState.getOwnDropsites().forEach(function (dropsite)
        {
            for (let type of dropsite.resourceDropsiteTypes())
            {
                gameState.ai.HQ.allDropsites[type].push(dropsite);
            }
        });

        // save the resources type for later use
        for (let resourceType of Resources.GetCodes())
        {
            for (let resource of gameState.getResourceSupplies(resourceType).values())
            {
                resource.ownType = resource.get("ResourceSupply/Type");

                if (resource.get("ResourceSupply/Amount") > 4000)
                    resource.distToInfluence = {}; // create the dist to influence object here
            }
        }

        this.RefreshResourceLists(gameState);

        // select the hero according to the AI name first, then select 2 random ones
        Engine.PostCommand(PlayerID, { "type": "ChooseHero", "civ": gameState.getPlayerCiv(), "name": gameState.getPlayerName() });
        Engine.PostCommand(PlayerID, { "type": "ChooseHero", "civ": gameState.getPlayerCiv() });
        Engine.PostCommand(PlayerID, { "type": "ChooseHero", "civ": gameState.getPlayerCiv() });

        gameState.SendAIDialog(gameState.ai.HQ.allAllies, "IntroAlly", this.AIDialogData, 4000);
        gameState.SendAIDialog(gameState.ai.HQ.allEnemies, "IntroEnemy", this.AIDialogData, 5000);

        this.currentPhase = gameState.currentPhase();
    };

    //  #############################################################
    //  GATHERERS AND BUILDERS BEHAVIOUR
    //  #############################################################

    m.HQ.prototype.InitEnemyUnit = function (gameState, ent, owner)
    {
        if (owner == 0 || gameState.isPlayerEnemy(owner) == false) // this entity needs to be an enemy and non gaia to be considered an enemy soldier
            return;

        if (!ent.hasClass("Unit"))
            return;

        if (ent.hasClass("LiveStock"))
            return;

        if (ent.hasClass("FemaleCitizen"))
            return;

        if (ent.get("Builder"))
            return;

        if (ent.get("Trader"))
            return;

        this.allEnemySoldiers[owner].push(ent); // if this unit is neither a citizen or a builder it must be a soldier or support unit
    }

    m.HQ.prototype.InitNewReplacement = function (entity, referenceEntity)
    {
        if (!entity.hasClass("Unit"))
            return;

        entity.AIState = 0;

        let assignedType = referenceEntity.assignedType;
        if (assignedType) {
            this.allGatherers[assignedType].push(entity);
            this.AssignResourceType(entity, assignedType);
        }

        let genericName = entity.genericName();
        let unitList = this.allUnits[genericName];
        if (!unitList)
        {
            this.allUnits[genericName] = [];
            this.allUnits[genericName].push(entity);
        }
        else
            unitList.push(entity);

        let addedToList = false;
        if (entity.hasClass("FemaleCitizen"))
        {
            this.allCitizens.push(entity);
            addedToList = true;
        }

        if (entity.get("Builder"))
        {
            this.allBuilders.push(entity);
            addedToList = true;
        }

        if (entity.get("Trader"))
        {
            this.allTraders.push(entity);
            this.InitTrader(entity);
            addedToList = true;
        }

        if (addedToList == false)
        {
            //error("add replacement " + JSON.stringify(entity));
            if (entity.hasClass("Hero")) // This is a hero entity, add this to the heroes list, then to the soldiers list
                this.allHeroes.push(entity);
            this.allSoldiers.push(entity); // if this unit is none of the classes above, it must be a soldier or support unit

            if (this.soldierState == 1)
            {
                if (this.checkpoints[this.currentCheckpoint + 1] != undefined) // set to defensive if the goal hasnt been reached yet
                    entity.setStance("defensive");
                else // otherwise, this is the final checkpoint, set to violent
                    entity.setStance("violent");

                this.MoveToCurrentCheckpoint([entity]); // send this new soldier to the current fight if we are already attacking
            }
        }
    }

    m.HQ.prototype.InitNewBattalion = function (entities)
    {
        let ent = entities[0];
        if (!ent.hasClass("Unit"))
            return;

        if (ent.hasClass("LiveStock"))
        {
            for (let entity of entities)
                entity.ignoreDefence = true;
            return;
        }

        for (let entity of entities)
            entity.AIState = 0;

        let addedToList = false;
        let isFemaleCitizen = ent.hasClass("FemaleCitizen");
        if (isFemaleCitizen == true)
        {
            this.AddGatherers(ent, entities); // only add gatherers that are female citizens for now, might be changed later

            for (let entity of entities)
                this.allCitizens.push(entity);
            addedToList = true;
        }

        // add units to their specific list for later use
        let genericName = ent.genericName();
        let unitList = this.allUnits[genericName];
        if (!unitList) {
            this.allUnits[genericName] = [];
            for (let entity of entities)
                this.allUnits[genericName].push(entity);
        }
        else
        {
            for (let entity of entities)
                unitList.push(entity);
        }

        if (ent.get("Builder"))
        {
            for (let entity of entities)
                this.allBuilders.push(entity);
            addedToList = true;
        }

        if (ent.get("Trader"))
        {
            for (let entity of entities)
                this.allTraders.push(entity);
            this.InitTrader(ent); // only have to give a single trade command per battalion
            addedToList = true;
        }

        if (addedToList == false)
        {
            if (ent.hasClass("Hero")) // This is a hero entity, add this to the heroes list first, then to the soldiers list
            { 
                for (let entity of entities)
                    this.allHeroes.push(entity);          
            }

            for (let entity of entities) // if this unit is none of the classes above, it must be a soldier or support unit
                this.allSoldiers.push(entity); 

            if (this.soldierState == 1) {
                if (this.checkpoints[this.currentCheckpoint + 1] != undefined) // set to defensive if the goal hasnt been reached yet
                    ent.setStance("defensive");
                else // otherwise, this is the final checkpoint, set to violent
                    ent.setStance("violent");

                this.MoveToCurrentCheckpoint([ent]); // send this new soldier to the current fight if we are already attacking
            }
        }
    }

    // Check whether the gatherer lists have to be reformed
    m.HQ.prototype.ShouldReformGatherers = function ()
    {
        // first check if it was a gathering battalion that was destroyed
        let codes = Resources.GetCodes();
        let total = 0;
        for (let type of codes)
        {
            let gatherers = this.allGatherers[type];
            total += this.GetBattalionCount(gatherers);
            this.UpdateList(gatherers);
            total -= this.GetBattalionCount(gatherers);
        }

        if (total < 1) // no change in number of gathering battalions after updating, return false 
            return false;

        let highest = 0;
        let lowest = Number.MAX_SAFE_INTEGER;

        //Get the lowest and highest length from the gatherer type lists
        for (let resourceType of codes)
        { 
            let gatherers = this.allGatherers[resourceType];
            let battalionLength = this.GetBattalionCount(gatherers); // convert to battalion mode
            if (battalionLength < lowest)
                lowest = battalionLength; // new lowest found

            if (battalionLength > highest)
                highest = battalionLength; // new highest found
        }

        // if the length difference between the lowest and the highest is 2 or more, the AI should reform their gatherers list
        if (highest - lowest >= 2)
            return true
        else
            return false;
    };

    // Reform the gatherers list when applicable
    m.HQ.prototype.CheckReformGatherers = function ()
    {
        if (this.ShouldReformGatherers() == false) // first check whether the AI should reform in the first place
            return false;

        let allGatherersTemp = [];
        let codes = Resources.GetCodes();

        // Get a temp list of all the gatherers to be reassigned, and empty the origin lists afterward to be refilled below
        for (let resourceType of codes) { 
            allGatherersTemp = allGatherersTemp.concat(this.allGatherers[resourceType]);
            this.allGatherers[resourceType].length = 0;
        }

        let battalions = this.RunAsBattalion(allGatherersTemp); // battalions to be assigned
        let gatherersPerType = Math.floor(battalions.length / codes.length); // gatherers per type
        let remainder = battalions.length - gatherersPerType * codes.length; // the remaining gathering battalions that could not be equally assigned
        let count = 0;

        // assign the gathering battalions equally for the 4 resources
        for (let resourceType of codes)
        {
            let start = gatherersPerType * count; // the start point per iteration
            for (let i = start; i < start + gatherersPerType; i++)
            {
                for (let ent of this.allBattalions.get(battalions[i].battalionID)) // assign every entity of this battalion
                {
                    this.allGatherers[resourceType].push(ent);
                    this.AssignResourceType(ent, resourceType);
                }
            }
            count++; // increment loop iteration
        }

        let index = gatherersPerType * codes.length; // the start index for the remainder
        // assign the remaining gathering battalions last, only 1 loop iteration required
        for (let resourceType of codes)
        {
            if (remainder > 0)
                remainder -= 1; // assign this remaining battalion, decrement counter
            else
                break; // no more battalions remaining, break

            //assign this battalion per index and increment
            for (let ent of this.allBattalions.get(battalions[index].battalionID)) // assign every entity of this battalion
            {
                this.allGatherers[resourceType].push(ent);
                this.AssignResourceType(ent, resourceType);
            }
            index++;

            //List reformed succesfully, force new gather command
            this.GatherResourceType(resourceType, this.allGatherers[resourceType], true);
        }
    };

    m.HQ.prototype.AddGatherers = function (ent, entities)
    {
        // if this unit can gather resources find the resource type that is required the most and assign that to the unit
        if (ent.canGather("food") || ent.canGather("wood") || ent.canGather("stone") || ent.canGather("metal")) {
            // get the possible types for this unit first before assigning the gather type
            let possibleTypes = [];
            for (let resourceType of Resources.GetCodes()) {
                if (ent.canGather(resourceType))
                    possibleTypes.push(resourceType);
            }

            let assignedType = "undefined";
            let lowest = Number.MAX_SAFE_INTEGER;
            for (let resourceType of possibleTypes) {
                let length = this.allGatherers[resourceType].length;
                if (length < lowest) {
                    lowest = length;
                    assignedType = resourceType;
                }
            }

            for (let entity of entities) {
                this.allGatherers[assignedType].push(entity);
                this.AssignResourceType(entity, assignedType);
            }

            this.GatherResourceType(assignedType, [ent], true); // since this entity group is a single battalion, we only need to give a command to the first entity of that battalion
        }
    }

    // return resources if possible
    m.HQ.prototype.CanReturnResource = function (ents)
    {
        for (let ent of ents)
        {
            let carrying = ent.resourceCarrying()[0];
            if (carrying == undefined)
                continue; // not carring anything, try next one

            let type = carrying.type;
            this.UpdateList(this.allDropsites[type]);

            let closest = undefined;
            let lowest = Number.MAX_SAFE_INTEGER;
            for (let dropsite of this.allDropsites[type]) // get the closest dropsite to return the resources
            {
                let distToDropsite = API3.SquareVectorDistance(dropsite.position(), ent.position());
                if (distToDropsite < lowest) {
                    lowest = distToDropsite;
                    closest = dropsite;
                }
            }

            if (closest == undefined) // should only happen when there are no dropsites available whatsoever
                return false;

            ent.returnResources(closest); // give the return order
            return true;
        }

        return false;
    }

    m.HQ.prototype.GatherResourceType = function (resourceType, gatherers, forceReset = false)
    {
        this.UpdateList(gatherers); // remove dead gatherers
        let battalionList = this.RunAsBattalion(gatherers); // convert to battalion mode
        let resourceTypeIsBanned = this.configData["StartStrategyBan"][0][resourceType];

        for (let type of this.allResourceTypes)
            this.UpdateList(this.allSupplies[type]); // remove destroyed resources

        for (let gatherer of battalionList)
        {
            // if this gatherer is currently not in a gather state, skip to the next one
            if (gatherer.AIState != 0)
                continue;

            let battalionEnts = this.allBattalions.get(gatherer.battalionID);
            if (forceReset == false) { // if this gather order isnt a forced reset and if the gatherers arent idle, dont give a new command     
                for (let battalionEnt of battalionEnts)
                {
                    if (battalionEnt.isIdle())
                    {
                        if (this.CanReturnResource(battalionEnts) == true) // we are about to give a gather order, return resources if possible first
                            break;
                        else {
                            this.GiveNewGatherCommand(resourceType, gatherer, resourceTypeIsBanned);
                            break; // command given, break now
                        }
                    }
                }
            }
            else // this is a forced command, give a new order
            {
                if (this.CanReturnResource(battalionEnts) == true) // we are about to give a gather order, return resources if possible first
                    continue;
                else
                    this.GiveNewGatherCommand(resourceType, gatherer, resourceTypeIsBanned);
            }
        }
    }

    m.HQ.prototype.GiveNewGatherCommand = function (resourceType, gatherer, resourceTypeIsBanned) {
        if (resourceTypeIsBanned == false) // we want this gatherer to gather another resource type if this one is currently banned
        {
            for (let specificType of this.assignedTypes[gatherer.assignedType]) // loop over all the sorted assigned types
            {
                for (let resource of this.allSupplies[specificType]) {
                    // if this particular resource is already full dont try to gather there
                    if (resource.isFull())
                        continue;

                    // gather order and return when a resource has been found for this gatherer
                    gatherer.gather(resource);
                    return; // gather order given so return
                }
            }
        }

        // no gather order given yet, so try to find a gatherable resource aside from the assigned type based upon the priority list
        // the resourcePriority List is based upon the resources that are required most, basically the amount of resources that the AI has
        for (let prioType of this.resourcePriorityList) {
            for (let specificType of this.assignedTypes[prioType]) // loop over the specific types from this raw prio type
            {
                if (prioType == resourceType || this.configData["StartStrategyBan"][0][prioType] == true) // if this type is banned or this type was already checked, continue to the next one
                    continue;

                for (let resource of this.allSupplies[specificType]) {
                    if (resource.isFull()) // if this particular resource is already full dont try to gather there
                        continue;

                    // gather order and break out of the loop when a resource has been found for this gatherer
                    gatherer.gather(resource);
                    return; // gather order given so return
                }
            }
        }
    };

    // refresh the total resource list from lowest to highest
    m.HQ.prototype.RefreshResourcePriorityList = function (resourceData) {
        this.resourcePriorityList.length = 0;
        let codes = Resources.GetCodes();
        for (let type of codes) // only used as counter
        {
            let lowestType = "";
            let lowest = Number.MAX_SAFE_INTEGER;
            for (let type of codes) // get the lowest value of all available types
            {
                if (resourceData[type] < lowest) {
                    lowest = resourceData[type];
                    lowestType = type;
                }
            }
            this.resourcePriorityList.push(lowestType);
            resourceData[lowestType] = Number.MAX_SAFE_INTEGER; // set the lowest value to infinity to nullify its existence for the next iteration
        }
    }

    m.HQ.prototype.SetResourceTypesBan = function (resourceData)
    {
        let banData = this.configData["StartStrategyBan"][0];
        let StartStrategyActive = this.configData["StartStrategy"].length >= this.startStrategyState;
        let forceResetTypes = [];
        let codes = Resources.GetCodes();
        // get a list with resources that are banned at the start of the game and ignore those during the startstrategy
        for (let resourceType of codes)
        {
            if (StartStrategyActive == true)
            {
                if (this.defaultBan[resourceType] == true)
                    continue;
            }

            //ban gathering resource types that exceed 32% of the total resources and are above 1000 resources
            let percentage = (resourceData[resourceType] / resourceData.total) * 100;
            if (percentage >= 32 && resourceData[resourceType] > 1000) {
                banData[resourceType] = true;
                forceResetTypes.push(resourceType); // resource status has been set to banned, force reset gatherers with this type later
            }
            else
            {
                if (banData[resourceType] == true) // if this resource was previously banned, force reset this type later
                    forceResetTypes.push(resourceType);

                banData[resourceType] = false;
            }
        }      

        // force reset the resource types that changed their ban status
        for (let resourceType of forceResetTypes) { this.GatherResourceType(resourceType, this.allGatherers[resourceType], true); }
    }

    m.HQ.prototype.BuildFoundations = function (foundations) {

        this.UpdateList(foundations); // remove destroyed foundations
        for (let foundation of foundations)
        {
            this.UpdateList(foundation.builders); // remove builders that are dead
            // add builders if the max hasnt been reached for this foundation
            if (foundation.builders.length < foundation.maxBuilders)
                this.AddBuildersToFoundation(foundation);

            // loop over the builders that have specifically been assigned to this foundation
            for (let i = 0; i < foundation.builders.length; i++)
            {             
                let builder = foundation.builders[i];
                let unitAIState = builder.unitAIState();
                unitAIState = unitAIState.split(".")[1];

                // dont give building instructions if this builder is already building
                if (unitAIState == "REPAIR")
                    continue;

                // give the repair/build order
                builder.repair(foundation);
            }
        }
    }

    m.HQ.prototype.AddBuildersToFoundation = function (foundation)
    {
        // loop over all potential builders from this player
        this.UpdateList(this.allBuilders); // remove dead builders
        for (let builder of this.RunAsBattalion(this.allBuilders))
        {
            // if the list of assigned builders is sufficient dont try to add more builders to the list and break
            if (foundation.builders.length >= foundation.maxBuilders)
                break;

            // dont add builders that are not in gather state, so when they are either defending or already building something else
            if (builder.AIState != 0)
                continue;

            // builder fits criteria so set build state and assign to this foundations builders list
            builder.AIState = 1;
            foundation.builders.push(builder);
        }
    }

    //  #############################################################
    //  CONSTRUCTING & BUILDING QUEUES
    //  #############################################################

    m.HQ.prototype.ConstructField = function (gameState)
    {             
        let path = gameState.applyCiv("structures/{civ}/{civ}_field");
        let template = gameState.getTemplate(path);

        let resourceType = template.getResourceType(); // the resource type of this field
        if (resourceType == undefined) // mainly for the Gerudo farms at the moment
            resourceType = "food";

        if (this.configData["StartStrategy"].length < this.startStrategyState) // dont check gather locations if this was a startstrategy call
        {
            //Dont construct another farm if there is a foundation present already
            //This is done to receive an accurate gatherLocations calculation
            this.UpdateList(this.allFarms);
            if (this.GetFoundationsOnly(this.allFarms).length > 0)
                return false;

            this.UpdateList(this.allSupplies[resourceType]); // remove destroyed resources
            let gatherLocations = 0;
            for (let supply of this.allSupplies[resourceType]) {
                gatherLocations += supply.maxGatherers(); // get the total number of available gathering spots
            }

            //calculate a banfactor based upon the number of resources being banned
            //when a resource is banned, those workers are distributed amongst other resources, including this type
            let banFactor = 1;
            let banData = this.configData["StartStrategyBan"][0];
            if (banData[resourceType] == false) // if this type is banned, we don't need more farms
            {
                for (let type of Resources.GetCodes()) {
                    if (banData[type] == true)
                        banFactor += 0.5; // for every type, add 50% additional farms above the usual requirement
                }
            }

            let gatherers = this.allGatherers[resourceType];
            this.UpdateList(gatherers); // update this (food) gatherers list before checking
            let battalionCount = this.GetBattalionCount(gatherers); // max gather locations are now based upon battalion count rather than per entity
            if (gatherLocations >= (Math.ceil(battalionCount * banFactor))) // if there are more gathering locations than gatherers, the AI doesnt need a new farm 
                return false;
        }

        let resources = this.GetResourceData(gameState);
        if (!this.CanAfford(resources, template))
            return false;
        
        if (!this.canBuild(gameState, "structures/{civ}/{civ}_field"))
            return "NaN";

        let obstructions = m.createObstructionMap(gameState, 0, template); // get obstruction map based upon the template
        let obstructionMax = template.obstructionRadius().max;
        let radius = (Math.ceil(obstructionMax / obstructions.cellSize)); // get the radius of the template multiplied by 5% to get some extra space
        let placementPos = [0, 0];              

        this.UpdateList(this.allDropsites[resourceType]);
        let freeSpot = [0, 0];

        for (let tile of this.ownedTiles)
        {
            let freeTileData = this.GetTileData(this.territoryMap, tile, radius, obstructions); // check if there is a free cell within this particular tile and use it if true
            if (!freeTileData.state)
                continue;

            // use math to convert the tile to a map position
            let pos = this.GetMapPos(freeTileData.freeCell, obstructions);
            if (freeSpot[0] == 0)
                freeSpot = pos; // save a free spot if no spot can be found within distance of a dropsite
            // check if this tile is close enough to a dropsite building and use that position if true
            for (let dropsite of this.allDropsites[resourceType])
            {
                let distToDropsite = API3.SquareVectorDistance(dropsite.position(), pos);
                let threshold = 50 + (dropsite.obstructionMax * 0.5) + (obstructionMax * 0.5); // add the obstructionradius * 0.5 to increase the threshold based on the size of the entity
                if (distToDropsite < threshold * threshold)
                {
                    this.allBuilders[0].construct(path, pos[0], pos[1], this.GetCivilAngle(placementPos));
                    return true;
                }
            }
        }
        // if no valid spot close to a dropsite was found just build it somewhere within our territory if possible
        if (freeSpot[0] > 0) {
            this.allBuilders[0].construct(path, freeSpot[0], freeSpot[1], this.GetCivilAngle(placementPos));
            return true;
        }
    }

    m.HQ.prototype.ConstructNetWorkBuilding = function (gameState)
    {
        if (this.configData["network"].length < 1)
            return;

        let configData = this.configData["network"];
        let NetWorkBuilding = configData[0];
        let template = gameState.getTemplate(NetWorkBuilding);
        let resources = this.GetResourceData(gameState);
        if (!this.CanAfford(resources, template))
            return;

        this.UpdateList(this.allNetworks.foundations); // update foundations list for the networks

        if (this.allNetworks.foundations.length > 0)
            return;

        // disabled for network buildings for now because the zora aqueducts are build temporarily differently atm
        //if (!this.canBuild(gameState, NetWorkBuilding))
        //    return;

        let obstructions = m.createObstructionMap(gameState, 0, template); // get obstruction map based upon the template
        let obstructionMax = template.obstructionRadius().max;
        let radius = (Math.ceil(obstructionMax / obstructions.cellSize)); // get the radius of the template multiplied by 5% to get some extra space
        let placementPos = [0, 0];
        let nonObstructedTile = 0;

        this.UpdateList(this.allCivilCentres);

        // get large supplies close enough to an influence building
        let closeSupplies = [];
        for (let resourceType in this.LargeSupplies.outside)
        {
            this.UpdateList(this.LargeSupplies.outside[resourceType]);
            for (let supply of this.LargeSupplies.outside[resourceType])
            {
                if (configData[1] == true) // if this is a radius faction, use the dist to civil center instead to prevent constructing outside the constrictions
                {
                    if (supply.distToCivilCenter < 150 * 150)
                        closeSupplies.push(supply);
                }
                else
                {
                    if (supply.distToInfluence[PlayerID] < 150 * 150)
                        closeSupplies.push(supply);
                }
            }
        }

        // try to construct the building near one of these close supplies first before attempting a random spot just outside our territory
        for (let supply of closeSupplies)
        {
            let rangeData = this.GetTileRangeList(obstructionMax, supply.obstructionRadius().max);
            for (let tile of this.GetSurroundingTiles(supply.position(), this.territoryMap, rangeData.rangeList, rangeData.endRange))
            {
                let freeTileData = this.GetTileData(this.territoryMap, tile, radius, obstructions);
                if (!freeTileData.state)
                    continue;

                let pos = this.GetMapPos(freeTileData.freeCell, obstructions);

                this.allBuilders[0].construct(NetWorkBuilding, pos[0], pos[1], this.GetCivilAngle(pos));
                return; // we are constructing so stop trying
            }
        }

        for (let tile of this.justOutOfTerritoryTiles)
        {
            // if a valid spot has been found, break to immediately give the build order
            if (placementPos[0] != 0)
                break;

            let freeTileData = this.GetTileData(this.territoryMap, tile, radius, obstructions);
            if (!freeTileData.state)
                continue;

            // use this spot since it is free and just outside of our territory
            let pos = this.GetMapPos(freeTileData.freeCell, obstructions);
            // check if this tile is close enough to a civil center building and use that position if true
            for (let centre of this.allCivilCentres)
            {                              
                let distToInfluenceEntity = API3.SquareVectorDistance(centre.position(), pos);
                if (distToInfluenceEntity < 150 * 150) {
                    placementPos = pos;
                    break;
                }
            }
        }
        // if no valid place to build was found, dont give a build order
        if (placementPos[0] != 0)
            this.allBuilders[0].construct(NetWorkBuilding, placementPos[0], placementPos[1], this.GetCivilAngle(placementPos));

        ////error("NETWORK placement pos " + placementPos + " nonObstructedTile " + nonObstructedTile + " builder " + this.allBuilders[0]);
    }

    // construct dropsite near resources taking types into account as well
    m.HQ.prototype.ConstructDropsite = function (gameState)
    {
        this.UpdateList(this.allDropsites["foundations"]);

        // if there already is a dropsite foundation present, wait until this is build
        if (this.allDropsites["foundations"].length > 0)
            return false;

        let path = gameState.applyCiv("structures/{civ}/{civ}_storehouse");
        let template = gameState.getTemplate(path);
        let obstructionMax = template.obstructionRadius().max;

        let resources = this.GetResourceData(gameState);
        if (!this.CanAfford(resources, template))
            return false;

        let assignedPos = [0, 0];

        for (let resourceType of Resources.GetCodes())
        {
            this.UpdateList(this.allDropsites[resourceType]); // update all dropsite lists
        }

        // only loop over the large supplies that are supported by the dropsite template
        for (let dropsiteType of template.resourceDropsiteTypes())
        {
            this.UpdateList(this.LargeSupplies.inside[dropsiteType]);
            for (let resource of this.LargeSupplies.inside[dropsiteType])
            {
                if (assignedPos[0] != 0)
                    break;

                let supplyType = resource.getResourceType();
                let pos = resource.position();
                let tooCloseToDropsite = false;
                // check if there already is a dropsite with the right type close enough to this resource before attempting to construct one
                for (let dropsite of this.allDropsites[supplyType])
                {
                    let distToDropsite = API3.SquareVectorDistance(pos, dropsite.position());
                    let threshold = 50 + (dropsite.obstructionMax * 0.5) + (obstructionMax * 0.5); // add the obstructionradius * 0.5 to increase the threshold based on the size of the entity
                    if (distToDropsite < threshold * threshold)
                    {
                        tooCloseToDropsite = true;
                        break;
                    }
                }

                // if this resource already has a dropsite in range try the next resource in the large supplies list
                if (tooCloseToDropsite == true)
                    continue;

                let obstructions = m.createObstructionMap(gameState, 0, template); // get obstruction map based upon the template
                let radius = (Math.ceil(obstructionMax / obstructions.cellSize)); // get the radius of the template multiplied by 5% to get some extra space

                if (!this.canBuild(gameState, path))
                    return "NaN";

                let rangeData = this.GetTileRangeList(obstructionMax, resource.obstructionRadius().max);
                for (let surroundingTile of this.GetSurroundingTiles(pos, this.territoryMap, rangeData.rangeList, rangeData.endRange))
                {
                    let freeTileData = this.GetTileData(this.territoryMap, surroundingTile, radius, obstructions);
                    if (!freeTileData.state)
                        continue;

                    assignedPos = this.GetMapPos(freeTileData.freeCell, obstructions); // use this spot since it is free
                    this.allBuilders[0].construct(path, assignedPos[0], assignedPos[1], this.GetCivilAngle(assignedPos));
                    return true;  // free spot found and order given, stop attempting to construct
                }
            }
        }

        ////error("DROPSITE placement pos " + assignedPos + " builder " + this.allBuilders[0] + " resource " + resource);
    }

    // construct houses in territory when close to reaching limit pop
    m.HQ.prototype.ConstructHouse = function (gameState) {
        this.UpdateList(this.allFoundations);

        // dont construct a house if there are already a set number of foundations present
        if (this.allFoundations.length >= 3)
            return false;

        // if the current pop is getting close to the limit attempt to build a house, else return
        if (this.configData["StartStrategy"].length < this.startStrategyState) // dont check pop if this was a startstrategy call
        {
            let popLimit = gameState.getPopulationLimit();
            let limit = +popLimit - 10;
            let currentPop = gameState.getPopulation();

            if (currentPop < limit)
                return false;

            if (popLimit >= gameState.getPopulationMax()) // if the limit pop has reached its max, stop creating houses
                return false;
        }

        let path = gameState.applyCiv("structures/{civ}/{civ}_house");
        let template = gameState.getTemplate(path);

        let resources = this.GetResourceData(gameState);
        if (!this.CanAfford(resources, template))
            return false;

        if (!this.canBuild(gameState, path))
            return "NaN";

        let obstructions = m.createObstructionMap(gameState, 0, template); // get obstruction map based upon the template
        let radius = (Math.ceil(template.obstructionRadius().max / obstructions.cellSize)); // get the radius of the template multiplied by 5% to get some extra space

        for (let ownedTile of this.ownedTiles)
        {
            let freeTileData = this.GetTileData(this.territoryMap, ownedTile, radius, obstructions);
            if (!freeTileData.state)
                continue;

            let pos = this.GetMapPos(freeTileData.freeCell, obstructions);
            this.allBuilders[0].construct(path, pos[0], pos[1], this.GetCivilAngle(pos));
            return true;
        }
    }

    // construct civil centers at the nearest large resource that is outside our territory
    m.HQ.prototype.ConstructCivilCenter = function (gameState) {
        // check if the pop is sufficient to consider constructing a civil centre
        let currentPop = gameState.getPopulation();
        if (currentPop < (gameState.getPopulationMax() - 10)) {
            if (currentPop < this.configData["PopPerExpansion"][0] * this.allCivilCentres.length)
                return false;
        }
        let path = null;
        if (this.configData["civilCentreTemplates"].length > 0)
            path = this.configData["civilCentreTemplates"][0];
        else
            path = gameState.applyCiv("structures/{civ}/{civ}_civil_centre");

        let template = gameState.getTemplate(path);
        let resources = this.GetResourceData(gameState);
        if (!this.CanAfford(resources, template))
            return false;

        if (!this.canBuild(gameState, path))
            return;

        this.UpdateList(this.allCivilCentres); // update the civil centre list
        for (let resourceType in this.LargeSupplies.outside)
            this.UpdateList(this.LargeSupplies.outside[resourceType]); // update the largesupplies outside list

        let obstructionRadius = template.obstructionRadius().max;
        let obstructions = m.createObstructionMap(gameState, 0, template); // get obstruction map based upon the template
        let radius = (Math.ceil(obstructionRadius / obstructions.cellSize)); // get the radius of the template multiplied by 5% to get some extra space

        // get the nearestSupply outside our territory
        let lowest = Number.MAX_SAFE_INTEGER;
        let nearestSupply = null;

        for (let resourceType in this.LargeSupplies.outside)
        {
            for (let supply of this.LargeSupplies.outside[resourceType])
            {
                if (supply.distToInfluence[PlayerID] < lowest) // also make sure its above 200 * 200 for the civil center distance
                {
                    lowest = supply.distToInfluence[PlayerID];
                    nearestSupply = supply;
                }
            }
        }

        // return if there is no supply outside at all
        if (nearestSupply == null)
            return;

        let rangeData = this.GetTileRangeList(obstructionRadius, nearestSupply.obstructionRadius().max);
        // loop over the tiles surrounding this resource supply
        for (let tile of this.GetSurroundingTiles(nearestSupply.position(), this.territoryMap, rangeData.rangeList, rangeData.endRange))
        {
            // make sure this tile has at least a free cell
            let freeTileData = this.GetTileData(this.territoryMap, tile, radius, obstructions);
            if (!freeTileData.state)
                continue;

            let mapPos = this.GetMapPos(freeTileData.freeCell, obstructions);
            let tooCloseToCivilCentre = false;

            // check if this tile is too close to a civil centre and try the next tile if true
            for (let civilCentre of this.allCivilCentres)
            {
                let distToCivilCentre = API3.SquareVectorDistance(mapPos, civilCentre.position());
                if (distToCivilCentre < 200 * 200)
                {
                    tooCloseToCivilCentre = true;
                    break;
                }
            }

            if (tooCloseToCivilCentre == true)
                continue;

            // construct the civil centre
            this.allBuilders[0].construct(path, mapPos[0], mapPos[1], 0);
            return true;
        }
    }

    //construct towers close to dropsites
    m.HQ.prototype.ConstructTower = function (gameState)
    {
        this.UpdateList(this.allFoundations);
        if (this.allFoundations.length > 2)
            return false;

        let path = gameState.applyCiv("structures/{civ}/{civ}_defense_tower");
        let template = gameState.getTemplate(path);

        let resources = this.GetResourceData(gameState);
        if (!this.CanAfford(resources, template))
            return false;

        if (!this.canBuild(gameState, path))
            return;

        let obstructionRadius = template.obstructionRadius().max;
        let obstructions = m.createObstructionMap(gameState, 0, template); // get obstruction map based upon the template
        let radius = (Math.ceil(obstructionRadius / obstructions.cellSize)); // get the radius of the template multiplied by 10% to get some extra space

        // save a random dropsite list to have some variety in the dropsites being checked
        // only check this random dropsite type to increase performance (could also check one dropsite type every turn and increment the typeToCheck to check them all every 4 function calls instead)
        let resourceCodes = Resources.GetCodes();
        let randomResourceType = pickRandom(resourceCodes);
        let finalList = [];
        let dropsiteList = this.allDropsites[randomResourceType];
        this.UpdateList(this.allDropsites[randomResourceType]);
        this.UpdateList(this.allFarms);

        // make a collective list of farms and the random dropsite type adding dropsites first so they will be attempted first
        for (let dropsite of dropsiteList)
            finalList.push(dropsite);

        for (let farm of this.allFarms)
        {
            let alreadyInList = false;
            for (let dropsite of dropsiteList)
            {
                if (dropsite.id() == farm.id())
                {
                    alreadyInList = true;
                    break;
                }
            }

            if (alreadyInList == false)
                finalList.push(farm); // only add farms that are not already a part of the dropsite list
        }
        let towerList = this.allBuildings[template.genericName()];
        if (towerList)
            this.UpdateList(towerList);
        else
            towerList = [];

        // loop over the tiles close to the random dropsite list and find a free spot to build
        for (let entity of finalList)
        {
            let rangeData = this.GetTileRangeList(obstructionRadius, entity.obstructionRadius().max);
            for (let tile of this.GetSurroundingTiles(entity.position(), this.territoryMap, rangeData.rangeList, rangeData.endRange))
            {
                let freeTileData = this.GetTileData(this.territoryMap, tile, radius, obstructions);
                if (!freeTileData.state)
                    continue;

                // if the selected pos is too close to a tower continue to the next tile
                let pos = this.GetMapPos(freeTileData.freeCell, obstructions);
                let tooCloseToTower = false;
                for (let tower of towerList) {
                    let distToTower = API3.SquareVectorDistance(pos, tower.position()); 
                    if (distToTower < 60 * 60) {
                        tooCloseToTower = true;
                        break; // already know this tile is too close to a tower so break and continue to the next tile
                    }
                }

                if (tooCloseToTower == true)
                    continue;

                this.allBuilders[0].construct(path, pos[0], pos[1], this.GetCivilAngle(pos));
                return true; 
            }
        }
    }

    //construct markets far away around civil centers (at the border of the influence range) and away from other markets
    m.HQ.prototype.ConstructMarket = function (gameState) {
        let path = gameState.applyCiv("structures/{civ}/{civ}_market");
        let template = gameState.getTemplate(path);

        this.UpdateList(this.allFoundations);
        if (this.allFoundations.length > 0) // dont build a market before the previous buildings or other markets are build 
            return false;

        // the number of markets should be equal to the number of civil centres + 1 extra at the start of the game to start trading as early as possible
        this.UpdateList(this.allMarkets);
        this.UpdateList(this.allCivilCentres);
        if (this.allMarkets.length > this.allCivilCentres.length)
            return false;

        let resources = this.GetResourceData(gameState);
        if (!this.CanAfford(resources, template)) // check if we can afford it right now
            return false;

        if (!this.canBuild(gameState, path)) // check if we are able to build this (limits and template availability)
            return "NaN";

        let obstructions = m.createObstructionMap(gameState, 0, template); // get obstruction map based upon the template
        let obstructionRadius = template.obstructionRadius();
        let radius = (Math.ceil(obstructionRadius.max / obstructions.cellSize)); // get the radius of the template
        let bestTileData = {};
        let farthestDist = 0;
        this.UpdateList(this.allCivilCentres);

        for (let center of this.allCivilCentres) {
            let modifiedInfluence = center.influence - obstructionRadius.max - center.obstructionRadius().max;
            let ratio = Math.round(+modifiedInfluence * 0.125); // get the tile ratio based on the influence of the entity to get an idea of how many tiles the influence stretches
            let rangeList = [ratio + 1, ratio, ratio - 1, ratio - 2, ratio - 3, ratio - 4]; // get tile ranges above and below this ratio
            let surroundingTiles = this.GetSurroundingTiles(center.position(), this.territoryMap, rangeList, ratio + 1);

            bestTileData = this.FindMarketSpot(surroundingTiles, radius, obstructions, center, bestTileData, farthestDist); // attempt with max radius first
            if (bestTileData.pos == undefined) {
                let value = (obstructionRadius.max + obstructionRadius.min) * 0.5;
                radius = (Math.ceil(value / obstructions.cellSize)); // if that wasnt successful, try the median radius instead
                bestTileData = this.FindMarketSpot(surroundingTiles, radius, obstructions, center, bestTileData, farthestDist);

                if (bestTileData.pos == undefined) {
                    radius = (Math.ceil(obstructionRadius.min / obstructions.cellSize)); // if that wasnt successful, try the min radius
                    bestTileData = this.FindMarketSpot(surroundingTiles, radius, obstructions, center, bestTileData, farthestDist);
                    if (bestTileData.pos == undefined)
                        continue; // no spot found after all 3 checks, go to next civil centre
                }
            }
        }

        if (bestTileData.pos == undefined) // no spot found, return false
            return "NaN";

        // after checking all free spots, the best spot is the one that is furthest away from all markets
        this.allBuilders[0].construct(path, bestTileData.pos[0], bestTileData.pos[1], bestTileData.center.angle()); // construct market
        return true;
    }

    // Attempt to find a proper market spot based upon surrounding tiles and the obstruction radius
    m.HQ.prototype.FindMarketSpot = function (surroundingTiles, radius, obstructions, center, bestTileData, farthestDist)
    {
        for (let tile of surroundingTiles)
        {
            let freeTileData = this.GetTileData(this.territoryMap, tile, radius, obstructions);
            if (!freeTileData.state)
                continue;

            let pos = this.GetMapPos(freeTileData.freeCell, obstructions);

            let lowestLocal = Number.MAX_SAFE_INTEGER;
            for (let market of this.allMarkets) { // get the lowest range toward all markets available
                let dist = API3.SquareVectorDistance(pos, market.position());
                if (dist < lowestLocal)
                    lowestLocal = dist;
            }
            if (lowestLocal > farthestDist) { // use that value to determine which free spot is the furthest away from other markets
                farthestDist = lowestLocal;
                bestTileData.pos = pos;
                bestTileData.center = center;
            }
            else // there are no markets yet, therefore, no need to check for distances yet
                return bestTileData;
        }

        return bestTileData;
    }

    // Construct queued buildings based on their placement style
    m.HQ.prototype.ConstructQueuedBuilding = function (gameState, path, template)
    {
        if (template == undefined)
        {
            //error("path " + path + " template " + template);
            this.queuedBuilding = { "path": null, "template": null };
            return false;
        }

        let resources = this.GetResourceData(gameState);
        if (!this.CanAfford(resources, template)) // check if we can afford it right now
            return false;

        // make this a switch statement if it requires expanding, making ConstructWithinTerritory the default method
        // at that stage add an extra element to the queuedbuilding object with the ending letters of the path or simply splitting it at the underscore (_)
        let result = this.ConstructWithinTerritory(gameState, path, template);
        
        this.queuedBuilding = { "path": null, "template": null }; // set the queue back to null at the end, even if no free spot was found
        return result;
    }

    // Construct buildings that can simply be placed somewhere within our territory
    m.HQ.prototype.ConstructWithinTerritory = function (gameState, path, template)
    {
        let obstructions = m.createObstructionMap(gameState, 0, template); // get obstruction map based upon the template
        let obstructionRadius = template.obstructionRadius();
        let radius = (Math.ceil(obstructionRadius.max / obstructions.cellSize)); // get the radius of the template

        for (let ownedTile of this.ownedTiles) {
            let freeTileData = this.GetTileData(this.territoryMap, ownedTile, radius, obstructions);
            if (!freeTileData.state)
                continue;

            let pos = this.GetMapPos(freeTileData.freeCell, obstructions);
            this.allBuilders[0].construct(path, pos[0], pos[1], this.GetCivilAngle(pos));
            return true; // building is being constructed so stop trying to construct again
        }

        // if the max radius was unsuccesful, try the median radius instead
        let value = (obstructionRadius.min + obstructionRadius.max) * 0.5;
        radius = (Math.ceil(value / obstructions.cellSize));
        for (let ownedTile of this.ownedTiles) {
            let freeTileData = this.GetTileData(this.territoryMap, ownedTile, radius, obstructions);
            if (!freeTileData.state)
                continue;

            let pos = this.GetMapPos(freeTileData.freeCell, obstructions);
            this.allBuilders[0].construct(path, pos[0], pos[1], this.GetCivilAngle(pos));
            return true; // building is being constructed so stop trying to construct again
        }

        // if even that was unsuccesful, try min radius instead (This might remove blocking resources in the process however)
        radius = (Math.ceil(obstructionRadius.min / obstructions.cellSize));
        for (let ownedTile of this.ownedTiles) {
            let freeTileData = this.GetTileData(this.territoryMap, ownedTile, radius, obstructions);
            if (!freeTileData.state)
                continue;

            let pos = this.GetMapPos(freeTileData.freeCell, obstructions);
            this.allBuilders[0].construct(path, pos[0], pos[1], this.GetCivilAngle(pos));
            return true; // building is being constructed so stop trying to construct again
        }

        return "NaN"; //no spot found, return false
    }

    // Save a building from the advanced config file as a queued building
    m.HQ.prototype.QueueBuildingFromConfig = function (gameState)
    {
        this.UpdateList(this.allFoundations);
        if (this.allFoundations.length > 2)
            return;

        let paths = [];
        for (let path of this.configData["advanced"]) // make a clone array of the advanced construction list
            paths.push(path);

        // check every potential building from the list and break when one has been found
        for (let i = 0; i < this.configData["advanced"].length; i++)
        {
            let randIndex = randIntExclusive(+0, +paths.length); // get a random index from the paths list
            let path = paths[randIndex]; // get the random value index that we still need to check
            paths.splice(randIndex, 1); //after the random index has been used for assignment, splice it from the potential path list so it wont be checked again

            let template = gameState.getTemplate(path);
            if (!this.canBuild(gameState, path)) // check if this can be build
                continue;

            let minPop = 0;
            let minPopPerCopy = 0;
            let maxCopies = 1;
            let AIMaxCopiesPerBase = 1;
            let succesiveList = [];
            let buildingNumber = 0;

            // get the ai settings if present
            if (template.AIMinPop())
                minPop = template.AIMinPop();

            if (template.AIMinPopPerCopy())
                minPopPerCopy = template.AIMinPopPerCopy();

            if (template.AIMaxCopies())
                maxCopies = template.AIMaxCopies();

            //if (template.AIMaxCopiesPerBase())
            //    AIMaxCopiesPerBase = template.AIMaxCopiesPerBase();

            let tempTemplate = template; // use a different variable here because it will be changed multiple times and we still need the original later
            // get the amount of succesive upgrades this building has
            while (true) {
                if (tempTemplate.getUpgradeBuilding()) {
                    succesiveList.push(tempTemplate);
                    tempTemplate = gameState.getTemplate(tempTemplate.getUpgradeBuilding());
                }
                else {
                    succesiveList.push(tempTemplate);
                    break;
                }
            }

            // check how many of the selected building has been build already taking the upgrades into account aswell
            for (let succesiveTemplate of succesiveList) {
                let list = this.allBuildings[succesiveTemplate.genericName()];
                if (!list)
                    continue;

                this.UpdateList(list);
                buildingNumber += list.length;
            }

            // if the maxcopies per base has been exceeded dont construct this
            this.UpdateList(this.allCivilCentres);
            if (template.AIMaxCopiesPerBase()) {
                if (buildingNumber >= (template.AIMaxCopiesPerBase() * this.allCivilCentres.length))
                    continue;
            }

            if (buildingNumber >= maxCopies)
                continue;
                
            let population = gameState.getPopulation();
            if (population < minPop)
                continue;

            // if the population and maxcopy checks have been cleared, find a free spot/cell inside our territory to build this
            if (population < (this.allCivilCentres.length * minPopPerCopy))
                continue;

            this.queuedBuilding = { "path": path, "template": template }; // save this building as queued since we should technically be able to build it now that the limits have been cleared
            return; // a building has been found so no need to continue
        }
    };

    // Construct the current building in line according to the start strategy for this faction
    m.HQ.prototype.ConstructFromStartStrategy = function (gameState, data) {
        let dataPath = data[this.startStrategyState - 1];
        let constructPath = "Construct" + dataPath;
        let succes = false;

        if (gameState.ai.HQ[constructPath] != undefined)
            succes = gameState.ai.HQ[constructPath](gameState);
        else {
            let resources = this.GetResourceData(gameState);
            let template = gameState.getTemplate(dataPath);
            if (!this.CanAfford(resources, template)) // check if we can afford it right now
                return;

            succes = this.ConstructWithinTerritory(gameState, dataPath, template);
        }

        if (succes == "NaN") 
            this.startStrategyFailed += 1;
        else if (succes == true) // continue if the building was constructed succesfully
        {
            this.startStrategyState += 1;
            this.startStrategyFailed = 0;
        }
            

        if (this.startStrategyFailed > 2) // if we failed to construct this more than twice, continue to the next building
        {
            this.startStrategyState += 1;
            this.startStrategyFailed = 0;
        }      

        if (data.length < this.startStrategyState)
        {
            for (let element in this.configData["StartStrategyBan"][0])
                this.configData["StartStrategyBan"][0][element] = false; // reset bans, since this is no longer required

            for (let resourceType of Resources.GetCodes())
                this.GatherResourceType(resourceType, this.allGatherers[resourceType], true); // force reset gathering with this supply list refreshed
        }
    }

    //  #############################################################
    //  MARKET BEHAVIOUR
    //  #############################################################

    m.HQ.prototype.BarterResources = function (gameState, resourceData)
    {
        this.UpdateList(this.allMarkets);
        if (this.allMarkets.length < 1)
            return; // no markets available

        let newData = { "lowest": Number.MAX_SAFE_INTEGER, "lowestType": "", "highest": 0, "highestType": "" }
        for (let resourceType of Resources.GetCodes()) // get both the highest and lowest resource available to the player
        {
            let amount = resourceData[resourceType];
            if (amount < newData.lowest) {
                newData.lowest = amount;
                newData.lowestType = resourceType;
            }

            if (amount > newData.highest) {
                newData.highest = amount;
                newData.highestType = resourceType;
            }
        }
      
        let barterAmount = Math.floor((newData.highest - newData.lowest) * 0.5); // barter amount should be half the difference so the two resources find middle ground
        let barterPrices = gameState.getBarterPrices(); // the worth of resources per item sold or bought (selling = 90 and buying = 110 worth at the start)
        let ingameRate = Math.round(100 * barterPrices.sell[newData.highestType] / barterPrices.buy[newData.lowestType]); // how many resources can be bought by selling the worth of these resources i.e. the sell to buy rate

        if (barterAmount > 400) // barter for 500 when above 400 because it is more efficient
        {
            if (ingameRate < 70) // check ingame rate
                return;
            this.allMarkets[0].barter(newData.lowestType, newData.highestType, 500); // no need to check post rates, because even at the best possible exchange rate, a barter of 500 will bring it down to 66 rating
        }
        else // below 400 barter, exchange resources per 100
        {
            let timesToBarter = Math.floor(barterAmount * 0.01); // bartering has to be done per 100 or per 500, so floor to the number of barters that should take place
            for (let i = 0; i < timesToBarter; i++)
            {
                let newRate = i * 2; // the value of the bought resource goes up by 2 and the value of the sold resource goes down by 2 after an exchange of 100 resources (10 for a barter of 500)
                ingameRate = Math.round(100 * (barterPrices.sell[newData.highestType] - newRate) / (barterPrices.buy[newData.lowestType] + newRate)); // recalculate/mimic the barter value change after the first barter

                if (ingameRate < 70)
                    return; // if the amount that can be bought is lower than 70 to a 100 of the resource being sold, dont barter anymore
                this.allMarkets[0].barter(newData.lowestType, newData.highestType, 100);
            }
        }
    }

    // when a new trader is created, give it an instant trading order
    m.HQ.prototype.InitTrader = function (trader)
    {
        if (this.currentTradeRoute.length < 2) 
            return; // no trade route to use, return

        trader.tradeRoute(this.currentTradeRoute[0], this.currentTradeRoute[1]); // set the trader to the current route
    }

    m.HQ.prototype.SetMarketRoute = function ()
    {
        this.UpdateList(this.allMarkets);
        if (this.allMarkets.length < 2)
        {
            this.currentTradeRoute = []; // set/reset trade route to null
            return; // not enough markets for a trade route
        }

        // set the current trade route based upon distance between them
        let highest = 0;
        for (let market1 of this.allMarkets)
        {
            for (let market2 of this.allMarkets)
            {
                if (market1.id() == market2.id())
                    continue;

                let dist = API3.SquareVectorDistance(market1.position(), market2.position());
                if (dist > highest) 
                { // set the current trade route to this highest one
                    highest = dist;
                    this.currentTradeRoute[0] = market1; 
                    this.currentTradeRoute[1] = market2;
                }
            }
        }

        this.UpdateList(this.allTraders);
        if (this.allTraders.length < 1)
            return; // no traders left, return       

        for (let trader of this.allTraders)
            trader.tradeRoute(this.currentTradeRoute[0], this.currentTradeRoute[1]); // set all traders to the current trade route
    }

    m.HQ.prototype.SetTradingRates = function (gameState, resourceData)
    {
        let tradingGoods = {}; // will hold the percentages for the trading goods that will be sent
        let total = resourceData.total;
        let totalPercentage = 0;
        let lowest = { "type": undefined, "amount": Number.MAX_SAFE_INTEGER };
        for (let resourceType of Resources.GetCodes())
        {
            // subtract the values from 100 to represent the proper percentages for the trading rates
            // 100 is used because the max trade percentage we want for every resources is 100%, meaning only that resource will be traded for
            // the represented percentage of the total (so lets say material = 30% of the total) is multiplied by 3 for every resource type so we end up with around 300 in total 
            // this 300 value can then be subracted from the initial 400 to get back to roughly 100%

            let percentage = 100 - (Math.ceil((resourceData[resourceType] / total) * 300)); // get the percentage this resource type represents of the total, multiplied by 3
            if (percentage < 0)
                percentage = 0; // resources that represent more than 33%, will become negative values so set to 0

            tradingGoods[resourceType] = percentage; // save the percentage inside the to-be-sent object
            totalPercentage += percentage; // keep track of the total percentage because it needs to add up to 100 in the end

            if (percentage < lowest.amount && percentage > 0) // save the type that is required the least for the remainder aside from those with a value of 0
            {
                lowest.amount = percentage;
                lowest.type = resourceType;
            }
        }

        let remainder = totalPercentage - 100;
        if (remainder != 0) // if the remainder is not 0, the difference must be compensated for to get a total of 100%
        {
            if (lowest.amount > remainder)
                tradingGoods[lowest.type] -= remainder; // the lowest value above 0 can be reduced by the remainder without going below 0
            else 
            { // the lowest value above 0 will go below 0 and the other values have to compensate as well
                tradingGoods[lowest.type] = 0; // set this one to 0 anyway
                let updatedRemainder = remainder - lowest.amount; // and get the new remainder after that
                for (let value in tradingGoods) 
                { 
                    if (tradingGoods[value] > updatedRemainder) { // get any value above this new remainder and remove from one of them to reach 100% total
                        tradingGoods[value] -= updatedRemainder;
                        break;
                    }
                }
            }
        }
        Engine.PostCommand(PlayerID, { "type": "set-trading-goods", "tradingGoods": tradingGoods });
    }

    //  #############################################################
    //  UPGRADING AND TECHS
    //  #############################################################

    // attempt to research a technology that was specified in the config file
    m.HQ.prototype.ResearchTechs = function (gameState)
    {
        let paths = [];
        for (let path of this.configData["Techs"]) // make a clone array of the advanced construction list
            paths.push(path);

        for (let i = 0; i < this.configData["Techs"].length; i++)
        {
            let randIndex = randIntExclusive(+0, +paths.length); // get a random index from the paths list
            let techData = paths[randIndex]; // get the random value index that we still need to check
            paths.splice(randIndex, 1); //after the random index has been used for assignment, splice it from the potential path list so it wont be checked again

            let template = gameState.getTemplate(techData.name);
			//error("techname " + techData.name );
            let requirements = template._template.requirements.all[0].tech; // reference to the tech requirement (usually village,town or city phase)
            if (!gameState.isResearched(requirements)) // check if the required tech has been researched
                continue;

            if (gameState.isResearching(techData.name)) // check if the tech is already being researched
                continue;

            let resourceData = this.GetResourceData(gameState);
            // set the margin level depending on the priority of the tech, 1 is default for high
            let margin = 1;
            if (techData.priority.startsWith("m")) // medium prio requires 1.75 times the resources
                margin = 1.75;
            else if (techData.priority.startsWith("l")) // low prio requires 2.5 times the resources
                margin = 2.5;
            else if (techData.priority.startsWith("v")) // very low prio requires 5 times the resources
                margin = 5;

            if (!this.CanAffordTech(gameState, resourceData, techData.name, margin))
                continue;

            let buildingList = this.allBuildings[techData.building];
            if (!buildingList) // make sure the required building list for this tech exists (the building references for techs will be gathered from the data in a later version)
                continue;

            this.UpdateList(buildingList);
            let ExclusiveList = this.GetWithoutFoundations(buildingList);
            if (ExclusiveList[0] != undefined)
            {
                buildingList[0].research(techData.name); // all requirements met, research this tech
                //error("name: " + techData.name + " required: " + requirements + " building " + buildingList[0]);
                break; // already researched a tech now, dont try to research again
            }
        }
    }

    //  #############################################################
    //  HELPER FUNCTIONS
    //  #############################################################

    /**
    * A shortened version of RunAsBattalion, used to return the number of unique battalion ID's within a list of entities
    */
    m.HQ.prototype.GetBattalionCount = function (entities) {
        let BattalionIndices = [];
        let count = 0;
        for (let ent of entities) // get all the battalions present in the selection of entities
        {
            let battalionID = ent.battalionID;
            if (battalionID == undefined)
                continue;

            if (BattalionIndices.indexOf(battalionID) == -1) // this battalion wasnt added yet,
            {
                BattalionIndices.push(battalionID); // so push to the indices list
                count += 1; // found a new battalion ID
            }
        }

        return count;
    };

    /**
    * Filter a selection of entities down to each first individual of a battalion
    */
    m.HQ.prototype.RunAsBattalion = function (entities)
    {
        let BattalionIndices = [];
        for (let ent of entities) // get all the battalions present in the selection of entities
        {
            let battalionID = ent.battalionID;
            if (battalionID == undefined)
                continue;

            if (BattalionIndices.indexOf(battalionID) == -1) // this battalion wasnt added yet,
                BattalionIndices.push(battalionID); // so push to the indices list
        }
        let entityList = [];
        for (let index of BattalionIndices) // make a new list of every first entity inside the battalions and return that as the result 
        {
            let entity = this.allBattalions.get(index)[0];
            if (entity != undefined) // it could be that the battalion was destroyed, but not yet removed
                entityList.push(entity);
        }

        return entityList;
    }

    // update influence from influential entities and refresh tile list if this is the case (from techs most likely)
    m.HQ.prototype.CheckInfluenceChange = function (gameState)
    {
        let refresh = false;

        this.UpdateList(this.allInfluenceEntities);
        for (let ent of this.allInfluenceEntities)
        {
            let influence = ent.get("TerritoryInfluence/Radius");
            if (ent.influence != influence)
            {
                refresh = true;
                ent.influence = influence;
            }
        }

        if (refresh == true) {
            this.RefreshTileLists();
            this.RefreshResourceLists(gameState);
        }
    }

    // return whether a phase up should be considered
    m.HQ.prototype.ReachedPhasePop = function (gameState)
    {
        let configLimit = this.configData["PhaseUpMinPop"][this.currentPhase - 1];
        if (!configLimit)
            return false;

        // check if the pop is sufficient to consider phasing up
        let currentPop = gameState.getPopulation();
        if (currentPop < configLimit)
            return false;

        return true;
    };

    // return whether a phase up should be considered
    m.HQ.prototype.CanPhaseUp = function (gameState)
    {
        if (this.ReachedPhasePop(gameState) == false)
            return false;

        let path = gameState.getPhaseName(this.currentPhase + 1);
        if (!path)
            return false;

        if (!gameState.canResearch(path)) // checks the intricate entity requirements with a technology simulation
            return false;

        let resourceData = this.GetResourceData(gameState);
        if (!this.CanAffordTech(gameState, resourceData, path))
            return true; // return true to indicate the AI should wait until it can research this

        this.AttemptPhaseUp(gameState);
    };

    // phase up all the way from village phase to city phase when appropriate
    m.HQ.prototype.AttemptPhaseUp = function (gameState)
    {
        let path = gameState.getPhaseName(this.currentPhase + 1);
        if (!path)
            return false;

        this.UpdateList(this.allCivilCentres);
        if (this.allCivilCentres[0] != undefined)
            this.allCivilCentres[0].research(path);
    }

    // sort resource types for this gatherer template
    m.HQ.prototype.RefreshSortedResources = function (gatherRates = undefined) {
        // attempt to assign the gather rates 
        if (gatherRates == undefined) {
            if (this.allCitizens[0])
                gatherRates = this.allCitizens[0].resourceGatherRates();
            else // no citizen present and no gather rates provided so return 
                return;
        }

        // reset the sorted resource list before updating them
        for (let resourceType in this.assignedTypes)
            this.assignedTypes[resourceType].length = 0;

        for (let type in gatherRates) // only used as counter
        {
            let highestType = "";
            let highest = 0;
            for (let type in gatherRates) // get the highest value of all available types
            {
                if (gatherRates[type] > highest) {
                    highest = gatherRates[type];
                    highestType = type;
                }
            }
            this.assignedTypes[highestType.split(".")[0]].push(highestType); // also add this highest type to the specific assigned list

            gatherRates[highestType] = 0; // set the highest value to 0 to nullify its existence for the next iteration
        }
    }

    // let this entity know which resource type it is assigned to (has to be mapped per gathering template later rather than just for the citizen template)
    m.HQ.prototype.AssignResourceType = function (gatherer, assignedType) {
        gatherer.assignedType = assignedType; // assign the resource type for this entity to use later

        //TODO: When the number of gathering templates is increased, the sortedResourceTypes and assignedTypes need to be mapped per template
        //Currently however, the female citizen is the only gathering template for the current AI factions that are available
    }

    // return the map position from a tile
    m.HQ.prototype.GetMapPos = function (tile, map)
    {
        let width = map.width;
        let cellSize = map.cellSize;
        return [cellSize * (tile % width + 0.5), cellSize * (Math.floor(tile / width) + 0.5)];
    }

    // return a range list based on the obstruction of a template (mainly useful for the GetSurroundingTiles function parameter)
    m.HQ.prototype.GetTileRangeList = function (constructingRadius, refRadius)
    {
        let startRange = Math.round((refRadius * 0.125)); // the radius of the referenced building * a factor based around the cellsize
        let endRange = Math.ceil(startRange + ((constructingRadius * 1.25) * 0.125)); // startrange + the radius of the entity that is about to be constructed * a factor ceiled to get some extra leeway 
        let rangeList = [];
        for (let i = startRange; i < endRange + 1; i++) // add the range of numbers into the list 
            rangeList.push(i);

        return { "rangeList": rangeList, "endRange": endRange };
    }

    // return the tile this entity is on
    m.HQ.prototype.GetTileNumber = function (entityPos, map)
    {
        let width = map.width;
        let cellSize = map.cellSize;
        return width * Math.floor(entityPos[1] / cellSize) + Math.floor(entityPos[0] / cellSize);
    }

    // return a free cell inside this tile if there is one
    m.HQ.prototype.GetTileData = function (map, tile, radius, obstructions)
    {
        // make sure this tile has at least a single non obstructed cell
        let nonObstructedTile = map.getNonObstructedTile(tile, radius, obstructions);
        if (nonObstructedTile < 0)
            return { "state": false, "freeCell": nonObstructedTile };

        if (this.borderMap.map[tile] & m.fullBorder_Mask)
            return { "state": false, "freeCell": nonObstructedTile };

        return { "state": true, "freeCell": nonObstructedTile };
    }

    // update a single item and return it back if it still exists for this player
    m.HQ.prototype.UpdateSingle = function (ent, playerID = PlayerID)
    {
        if (ent.setRemove["all"] != undefined || ent.setRemove[playerID] != undefined || !ent)
            return undefined;
        else
            return ent;
    }

    // update a given list by deleting removed game elements from it
    m.HQ.prototype.UpdateList = function (list, playerID = PlayerID)
    {
        let removedIndices = [];
        for (let i = 0; i < list.length; i++)
        {
            let ent = list[i];

            if (ent.setRemove["all"] != undefined || ent.setRemove[playerID] != undefined || !ent || ent.position() == undefined)
                removedIndices.push(i);
        }
        this.RemoveIndices(removedIndices, list);
    }

    // return a new list without its foundations
    m.HQ.prototype.GetWithoutFoundations = function (list)
    {
        let tempList = []; // use a temp list and return that one, the original list should be kept in its current state
        for (let i = 0; i < list.length; i++)
        {
            let ent = list[i];
            if (!ent.isFoundation)
                tempList.push(ent);
        }
        return tempList;
    }

    // return a new list without the completed foundations
    m.HQ.prototype.GetFoundationsOnly = function (list) {
        let tempList = []; // use a temp list and return that one, the original list should be kept in its current state
        for (let i = 0; i < list.length; i++)
        {
            let ent = list[i];
            if (ent.isFoundation)
                tempList.push(ent);
        }
        return tempList;
    }

    // update a given list by deleting removed game elements from it
    m.HQ.prototype.RemoveIndices = function (removedIndices, originList)
    {
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

    // get either the start location or the first civil center
    m.HQ.prototype.GetCivilLocation = function ()
    {
        this.UpdateList(this.allCivilCentres);
        let location = [0, 0];
        if (this.allCivilCentres.length > 0)
            location = this.allCivilCentres[0].position();
        else
            location = this.startLocation;

        return location;
    }

    // return the angle from the nearest civil centre based on the map position given
    m.HQ.prototype.GetCivilAngle = function (pos)
    {
        this.UpdateList(this.allCivilCentres);
        let lowest = Number.MAX_SAFE_INTEGER;
        let nearestCenter = null;
        for (let center of this.allCivilCentres)
        {
            let dist = API3.SquareVectorDistance(center.position(), pos);
            if (dist < lowest)
            {
                lowest = dist;
                nearestCenter = center;
            }
        }

        if (nearestCenter != null)
            return nearestCenter.angle();
        else
            return 0;
    }

    // return a list with resource data
    m.HQ.prototype.GetResourceData = function (gameState)
    {
        let resources = gameState.getResources();
           
        let totalresources = 0;
        for (let resourceType of Resources.GetCodes())
            totalresources += resources[resourceType];

        return { "food": resources["food"], "wood": resources["wood"], "stone": resources["stone"], "metal": resources["metal"], "total": totalresources};
    }

    // return whether this template can be constructed/trained
    m.HQ.prototype.CanAfford = function (resourceData, template, count = 1)
    {
        for (let resourceType of Resources.GetCodes())
        {
            let cost = template.get("Cost/Resources/" + resourceType);
            if (!cost)
                continue;
            cost = cost * count; // multiply cost with batchtrain only, cost is based upon the entire battalion now
            if (resourceData[resourceType] < cost)
                return false;
        }
        return true;
    }

    // return whether this template can be constructed/trained
    m.HQ.prototype.CanAffordTech = function (gameState, resourceData, techPath, margin = 1)
    {
        let template = gameState.getTemplate(techPath);
        for (let resourceType of Resources.GetCodes())
        {
            let cost = Math.ceil(template._template.cost[resourceType] * margin);
            if (!cost)
                continue;

            if (resourceData[resourceType] < cost)
                return false;
        }
        return true;
    }

    // convert startrange and endrange parameter into a list of 'regarded' ranges e.g. [1,3,6]
    // so in this example ranges 2,4 and 5 are disregarded automagically
    // the pattern has been figured out in the booklet
    // regarded values takes every value except disregarded values higher than itself e.g. 3 = all values except 4 and 5
    // disregarded values only takes regarded values higher than itself e.g. 2 = none except 3 and 6
    // so first get all horizontal tiles regardless of range or regardness levels
    // after this, if this range is regarded only skip the disregarded values higher than itself
    // if the range is disregarded only take the regarded values higher than itself
    // at the end make sure to add the horizontal tile to the final list aswell except if it is the starting tile(tilenumber) or a disregarded range

    // return the surrounding tiles from an entity in a list which can be customized using the regarded values (or ranges)
    m.HQ.prototype.GetSurroundingTiles = function (entityPos, map, regardedValues, endRange)
    {
        let range = +endRange + 1; // increment range to make this work inside the loops as intended
        let tileNumber = { "value": this.GetTileNumber(entityPos, map), "range": 1 }; // convert the pos of this entity to a tile index
        let horizontalTiles = [];
        let finalList = [];
        horizontalTiles.push(tileNumber);

        // cache the regarded state of the ranges that will be looped over later
        let rangeIsRegarded = [];
        for (let i = 1; i < range; i++)
        {
            let tempState = false;
            for (let value of regardedValues)
            {
                if (value == i)
                    tempState = true;
            }

            rangeIsRegarded.push(tempState);
        }

        // save the horizontal tiles to the right and left of the tile the entity is on
        for (let i = 1; i < range; i++)
        {
            horizontalTiles.push({ "value": +tileNumber.value + i, "range": i });
            horizontalTiles.push({ "value": +tileNumber.value - i, "range": i });
        }

        // loop over the horizontal tiles and get the upper and bottom tile of every single horizontal one based upon the range given
        for (let tile of horizontalTiles)
        {
            let tileIsRegarded = rangeIsRegarded[tile.range - 1]; // the rangeIsRegarded list starts counting from 0 so if we want the state of range 1, we need the first element(so element 0) from the rangeIsRegarded list
            if (tileIsRegarded == true) // if this horizontal tile is regarded
            {
                for (let j = 1; j < range; j++)
                {
                    if (!rangeIsRegarded[j - 1] && j > tile.range) // if this range (j) is disregarded and higher than the tile range, skip
                        continue;

                    let temp1 = +tile.value + (map.width * j); // get the tile above this horizontal tile * the range(j)
                    let temp2 = +tile.value - (map.width * j); // get the tile below this horizontal tile * the range(j)

                    finalList.push(temp1);
                    finalList.push(temp2);
                }
            }
            else // if this horizontal tile is disregarded
            {
                for (let j = 1; j < range; j++)
                {
                    if (rangeIsRegarded[j - 1] && j > tile.range) // if this range (j) is regarded and higher than the tile range, add it
                    {
                        let temp1 = +tile.value + (map.width * j); // get the tile above this horizontal tile * the range(j)
                        let temp2 = +tile.value - (map.width * j); // get the tile below this horizontal tile * the range(j)

                        finalList.push(temp1);
                        finalList.push(temp2);
                    }
                }
            }

            // the tile the entity is on is a part of the horizontal list so dont add that one
            // also make sure to only add tiles that are considered regarded
            if (tile.value != tileNumber.value && tileIsRegarded == true)
                finalList.push(tile.value);
        }

        return finalList;
    }

    // could also use getIndexOf to find if elements exist inside the lists already, but seems to be more expensive anyway to do this for every element instead of just refilling the list entirely
    m.HQ.prototype.RefreshTileLists = function ()
    {
        this.ownedTiles.length = 0;
        this.justOutOfTerritoryTiles.length = 0;

        this.UpdateList(this.allInfluenceEntities); // remove the destroyed influence entities beforehand

        for (let i = 0; i < this.territoryMap.length; i++)
        {
            // if this tile is owned by us, add it to the ownedTiles list
            let tileOwner = this.territoryMap.getOwnerIndex(i);
            this.TileOwners.set(i, tileOwner); // save the owner for every tile for later use
            if (tileOwner === PlayerID)
                this.ownedTiles.push(i);
            else
            {
                // if this tile is not by owned by us, check the distance to the influential entities
                for (let j = 0; j < this.allInfluenceEntities.length; j++)
                {
                    let entity = this.allInfluenceEntities[j];
                    // use the tile information to get the actual map position back from it
                    let pos = this.GetMapPos(i, this.territoryMap);
                    let distToTile = API3.SquareVectorDistance(entity.position(), pos);
                    let threshold = +entity.influence + 40; // add a flat influence of 40 to the threshold 

                    // if this tile is not owned by us, and within the threshold, add it to the justOutOfTerritoryTiles list
                    // the list will hold all tiles outside our territory within the flat base (in this case 40) added to the influence of the entity
                    if (distToTile < threshold * threshold)
                    {
                        this.justOutOfTerritoryTiles.push(i);
                        break;
                    }
                }
            }
        }

        //error("owned tiles " + this.ownedTiles.length + " justOutOfTerritory tiles " + this.justOutOfTerritoryTiles.length);
    }

    // refresh all supply lists (usually after our territory has changed only)
    m.HQ.prototype.RefreshResourceLists = function (gameState)
    {
        // reset all resource lists 
        for (let element in this.LargeSupplies)
        {
            for(let type in this.LargeSupplies[element])
                this.LargeSupplies[element][type].length = 0;
        }

        for (let element in this.allSupplies)
            this.allSupplies[element].length = 0;

        this.UpdateList(this.allInfluenceEntities);
        // assign supplies both in and outside range
        for (let resourceType of Resources.GetCodes())
        {
            this.UpdateList(this.allDropsites[resourceType]); // update the dropsite list per type
            for (let resource of gameState.getResourceSupplies(resourceType).values())
            {
                if (this.IsInOwnTerritory(resource) == false) // only add if it is inside ones territory
                    continue;

                let specificType = resource.get("ResourceSupply/Type");
                if (this.blockedResources.indexOf(specificType.split(".")[1]) != -1) // ignore resources this faction cant gather
                    continue;

                // resource exists within own territory, add it to the supplies list
                resource.ownType = specificType;
                this.allSupplies[resourceType].unshift(resource); // add to the beginning of the array instead to go from oldest to most recent instead
                this.allSupplies[specificType].unshift(resource);
                let resourcePos = resource.position();

                if (resource.resourceSupplyMax() > 4000) // add large supplies separately for dropsite construction
                {
                    for (let influentialEntity of this.allInfluenceEntities)
                    {
                        let dist = API3.SquareVectorDistance(influentialEntity.position(), resourcePos);
                        if (dist < +influentialEntity.influence * +influentialEntity.influence)
                        {
                            this.LargeSupplies.inside[resourceType].push(resource);
                            break; // break here because this resource has already been added, no need to check the other distances anymore
                        }
                    }
                }
            }

            this.GatherResourceType(resourceType, this.allGatherers[resourceType], true); // force reset gathering with this supply list refreshed
        }
    }

    /**
     * initialization needed after deserialization (only called when deserialization)
     */
    m.HQ.prototype.postinit = function (gameState) {
    };

    //  #############################################################
    //  EVENT CODE
    //  #############################################################

    m.HQ.prototype.OnDestroyBehaviour = function (gameState, ent) {
        // if this destroyed entity is a foundation, reset the assigned builders AI states and empty the list
        if (ent.foundationProgress() != undefined) {
            if (ent.builders) {
                for (let builder of ent.builders) {
                    builder.AIState = 0;
                }
                ent.builders.length = 0;
            }
        }
        else // if this is not a foundation reset the territory lists
        {
            // when the entity destroyed has a TerritoryInfluence reaching above the threshold of 60 refresh the map of owned and non owned tiles for buildings to utilize in the future
            let influence = ent.get("TerritoryInfluence/Radius");
            if (influence && influence >= 60) {
                this.RefreshTileLists();
                this.RefreshResourceLists(gameState);
            }
            else if (ent.get("ResourceDropsite") != undefined)
                this.RefreshResourceLists(gameState); // dropsites are used for resource lists

            if (ent.hasClass("Market")) // if a market has been destroyed, reset trade route
                this.SetMarketRoute();
        }

        // TODO: Check the trainable list instead to check whether the trainable ents still have a building count above 0 after updating that building list
        if (ent.hasClass("Structure")) {
            let buildingList = this.allBuildings[ent.genericName()];
            if (buildingList) {
                this.UpdateList(buildingList);
                let ExclusiveList = this.GetWithoutFoundations(buildingList);
                if (ExclusiveList.length == 0) // if this destroyed building was the last one available check if it has trainable units and remove them from the trainable units list
                {
                    let trainable = ent.GetTrainableEnts();
                    if (trainable) // if this building has trainable units remove them from the trainable units list
                    {
                        for (let path of trainable) {
                            let shouldBreak = false;
                            for (let element in this.trainableUnits) {
                                if (shouldBreak == true)
                                    break;
                                for (let i = 0; i < this.trainableUnits[element].length; i++) {
                                    if (this.trainableUnits[element][i]["path"] == path) {
                                        this.trainableUnits[element].splice(i, 1);
                                        shouldBreak = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    m.HQ.prototype.checkEvents = function (gameState, events) {
        //for (let evt of events.DiplomacyChanged) {
        //}

        for (let evt of events.Destroy)
        {
            if (evt && evt.entityObj)
            {
                // set entity to be removed from lists it might have relations to.
                let ent = evt.entityObj;

                ent.setRemove["all"] = true;

                // check if the ent is actually ours before continuing from this point
                if (!ent.isOwn(PlayerID))
                    continue;

                this.OnDestroyBehaviour(gameState, ent);
            }
        }

        for (let evt of events.EntityRenamed)
        {
            let newEnt = gameState.getEntityById(evt.newentity);
            if (!newEnt)
                continue;

            let influence = newEnt.get("TerritoryInfluence/Radius");
            if (influence) {
                if (influence >= 60)
                    this.RefreshTileLists();
            }

            let type = newEnt.get("ResourceSupply/Type");
            // check if this entity can be considered a resource
            if (type) {
                // pre cache position
                let pos = newEnt.position();
                let typeSplit = type.split(".")[0];
                if (newEnt.resourceSupplyMax() > 4000) {
                    // if this resource contains more than 4000 max resources and is in range of an influential entity (+ a factor to consider some outside territory), add it to the list
                    this.UpdateList(this.allInfluenceEntities);
                    for (let ent of this.allInfluenceEntities) {
                        let dist = API3.SquareVectorDistance(ent.position(), pos);
                        if (dist < +ent.influence * +ent.influence) {
                            this.LargeSupplies.inside[typeSplit].push(newEnt);
                            break; // break here because this resource has already been added, no need to check the other distances anymore
                        }
                    }
                }

                this.UpdateList(this.allDropsites[typeSplit]);
                for (let dropsite of this.allDropsites[typeSplit]) {
                    let dist = API3.SquareVectorDistance(dropsite.position(), pos);

                    // if this resource is close enough to one of the dropsites, add it to the supply list and break
                    if (dist < 10000) {
                        newEnt.ownType = type; // save the resources type for later use
                        this.allSupplies[typeSplit].push(newEnt);
                        this.allSupplies[type].push(newEnt);
                        break;
                    }
                }
            }
            
            // check if this entity actually belongs to us
            if (!newEnt.isOwn(PlayerID))
                continue;

            // dont add this to constructionFinished aswell otherwise it will be added twice
            if (newEnt.hasClass("Structure")) {
                this.AddTrainableUnits(newEnt, gameState); // do this before the building is applied to its list

                // make a new list for this building if it doesnt exist yet and add this ent to that specific list
                let allBuildingsList = this.allBuildings[newEnt.genericName()];
                if (!allBuildingsList) {
                    this.allBuildings[newEnt.genericName()] = [];
                    this.allBuildings[newEnt.genericName()].push(newEnt);
                }
                else
                    allBuildingsList.push(newEnt);

                // when the TerritoryInfluence of a building reaches above the threshold of 60 refresh the map of owned and non owned tiles for buildings to utilize in the future
                if (influence) {
                    if (influence >= 60) {
                        this.allInfluenceEntities.push(newEnt);
                        newEnt.influence = influence;
                    }
                }
            }
        }

        for (let evt of events.Create)
        {
            // cache reference to spawned entity and check if it belongs to this player before we do anything with it
            let ent = gameState.getEntityById(evt.entity);
            if (!ent || !ent.isOwn(PlayerID))
                continue;

            // what to do if the spawned entity is a foundation
            if (ent.foundationProgress() != undefined)
            {
                // add to foundations list 
                this.allFoundations.push(ent);
                ent.isFoundation = true;
                ent.obstructionMax = ent.obstructionRadius().max; // cache the obstruction radius for cheap and easy access to it later

                if (this.configData["network"].length > 0)
                {
                    if (ent.hasClass("NetworkBuilding"))
                        this.allNetworks.foundations.push(ent);
                }

                // create builder list for the foundation and the maxbuilders sent to repair it based on the build time of the foundation
                ent.builders = [];
                ent.maxBuilders = Math.ceil(ent.buildTime() * 0.05);

                this.AddBuildersToFoundation(ent);

                // if this constructed building is a field, add it to the farm list
                if (ent.hasClass("Field"))
                    this.allFarms.push(ent);

                // if this foundation is a dropsite, add it to the foundations list
                if (ent.hasClass("Storehouse"))
                    this.allDropsites["foundations"].push(ent);

                // make a new list for this building if it doesnt exist yet and add this ent to that list
                let allBuildingsList = this.allBuildings[ent.genericName()];
                if (!allBuildingsList)
                {
                    this.allBuildings[ent.genericName()] = [];
                    this.allBuildings[ent.genericName()].push(ent);
                }
                else
                    allBuildingsList.push(ent);        
            } 

            let type = ent.get("ResourceSupply/Type");
            // check if this entity can be considered a movable resource and act accordingly if so
            if (type && ent.BattalionSize() != undefined && ent.hasClass("Unit"))
            {
                let typeSplit = type.split(".")[0];
                this.allSupplies[typeSplit].push(ent);
                this.allSupplies[type].push(ent);
                ent.ownType = type; // save the resource type for later use
                ent.ignoreDefence = true;

                // move this resource to the closest dropsite
                let lowest = Number.MAX_SAFE_INTEGER;
                let chosenDropsitePos = -1;
                this.UpdateList(this.allDropsites[typeSplit]);

                for (let dropsite of this.allDropsites[typeSplit])
                {
                    let dropsitePos = dropsite.position();
                    let distToDropsite = API3.SquareVectorDistance(ent.position(), dropsitePos);
                    if (distToDropsite < lowest)
                    {
                        lowest = distToDropsite;
                        chosenDropsitePos = dropsite.position();
                    }
                }

                if (this.allDropsites[typeSplit].length > 0)
                    ent.move(chosenDropsitePos[0], chosenDropsitePos[1]);
            }
        }

        for (let evt of events.ConstructionFinished)
        {
            if (evt.Repaired != undefined) // this building has merely completed repairing, no need to go through the ConstructionFinished procedures
                continue;

            let newEnt = gameState.getEntityById(evt.newentity);
            // check if this entity actually belongs to us
            if (!newEnt)
                continue;

            if (!newEnt.isOwn(PlayerID))
            {
                if (newEnt.hasClass("CivilCentre"))
                    this.allEnemyCivilCentres[newEnt.owner()].push(newEnt);

                continue;
            }

            newEnt.obstructionMax = newEnt.obstructionRadius().max;

            if (this.configData["network"].length > 0)
            {
                if (newEnt.hasClass("NetworkBuilding"))
                    this.allNetworks.buildings.push(newEnt);
            }

            // if this constructed building is a field, add it to the farm list
            if (newEnt.hasClass("Field"))
                this.allFarms.push(newEnt);

            // if this constructed building is a civil center, add it to the civil center list
            if (newEnt.hasClass("CivilCentre"))
                this.allCivilCentres.push(newEnt);

            // if this constructed building is a market, add to the market list and reset route
            if (newEnt.hasClass("Market"))
            {
                this.allMarkets.push(newEnt);
                this.SetMarketRoute(); // new market, check if we can get a more advantageous route
            }

            let isDropsite = newEnt.get("ResourceDropsite");
            if (isDropsite)
            {
                // if this constructed building is a dropsite, add it to the specific dropsite lists based on which types are supported by this dropsite
                for (let resourceType of newEnt.resourceDropsiteTypes())
                    this.allDropsites[resourceType].push(newEnt); // make sure to add this before refreshing the resource list that makes use of the alldropsite list         

                this.RefreshResourceLists(gameState);
            }

            let influence = newEnt.get("TerritoryInfluence/Radius");
            // when the TerritoryInfluence of a building reaches above the threshold of 60 refresh the map of owned and non owned tiles for buildings to utilize in the future        
            if (influence)
            {
                if (influence >= 60) {
                    if (isDropsite == undefined) // only run the refresh if this wasnt already done by the dropsite section
                        this.RefreshResourceLists(gameState);
                }
            }
        }

        for (let evt of events.BattalionAdded)   // battalion event (player, id, entities)
        {
            let entities = [];
            for (let entity of evt.entities)
            {
                // convert the entity ID's to the entity objects
                let ent = gameState.getEntityById(entity);
                if(ent != undefined)
                    entities.push(ent);
            }

            // if this entity somehow no longer exists when it was added, return
            // Also, if this is a garrison battalion hidden by the UI, don't add it
            if (entities[0] == undefined || entities[0].hasClass("HiddenUI")) 
                continue;

            for (let ent of entities)
                ent.battalionID = evt.id;

            if (evt.player != PlayerID) // if this battalion event call was from an enemy player, add them to the enemy units
            {
                //error("add enemy battalion " + evt.id + " with ents " + entities.toString());
                for (let ent of entities)
                    this.InitEnemyUnit(gameState, ent, evt.player);

                continue;
            }
           
            this.allBattalions.set(evt.id, entities);
            this.InitNewBattalion(entities);
        }

        for (let evt of events.BattalionUpdate)   // battalion update event ('data' = battalion entities, 'id' = battalion ID, 'delete' = bool activated upon battalion removal, 'entity' = replaced entity if applicable)
        {
            if (evt.player != PlayerID)
            {
                if (evt.entity != undefined) // add potential enemy unit when it has been a replacement
                {
                    let ent = gameState.getEntityById(evt.entity);
                    if (ent != undefined)
                        this.InitEnemyUnit(gameState, ent, evt.player);
                }
                continue;
            }

            if (evt.delete) // this call is related to the deletion of the provided battalion
            {
                // upon deletion of a gathering battalion, reform the gatherer assignments per resource type if necessary
                // Do this before actually deleting the battalion from the allBattalions list
                this.CheckReformGatherers(); 
                this.allBattalions.delete(evt.id);
                continue;
            }

            // either on entity removal or replacement, re-set the data for this battalion
            let ents = [];
            for (let entity of evt.data)
            {
                // convert the entity ID's to the entity objects
                let ent = gameState.getEntityById(entity);
                if (ent != undefined)
                    ents.push(ent);
            }

            if (evt.entity) // occurs on replacement only (ReplaceBattalionEntity)
            {
                let ent = gameState.getEntityById(evt.entity);
                let referenceEntity = this.allBattalions.get(evt.id)[0];
                if (ent == undefined || referenceEntity == undefined)
                    continue;

                ent.battalionID = evt.id;
                this.InitNewReplacement(ent, referenceEntity);
            }
            this.allBattalions.set(evt.id, ents);
        }

        for (let evt of events.OwnershipChanged)   // capture events (entity, from, to)
        { 
            let ent = gameState.getEntityById(evt.entity);
            if (ent == undefined)
                continue;

            let influence = ent.get("TerritoryInfluence/Radius");
            if (influence) {
                if (influence >= 60)
                    this.RefreshTileLists();
            }

            ent.setRemove[evt.from] = true;
            ent.setRemove[evt.to] = undefined; // this entity could have been set before, make sure to set removal to undefined for this player
            if (PlayerID == evt.from)
                this.OnDestroyBehaviour(gameState, ent);
            else if (PlayerID == evt.to)
            {
                let newEnt = ent;                 
                if (newEnt.hasClass("Structure")) // if this converted entity is a structure, go through the completion behaviour
                {
                    this.AddTrainableUnits(newEnt, gameState); // do this before the building is applied to its list

                    // make a new list for this building if it doesnt exist yet and add this ent to that specific list
                    let allBuildingsList = this.allBuildings[newEnt.genericName()];
                    if (!allBuildingsList) {
                        this.allBuildings[newEnt.genericName()] = [];
                        this.allBuildings[newEnt.genericName()].push(newEnt);
                    }
                    else
                        allBuildingsList.push(newEnt);

                    newEnt.obstructionMax = newEnt.obstructionRadius().max;

                    if (this.configData["network"].length > 0) {
                        if (newEnt.hasClass("NetworkBuilding"))
                            this.allNetworks.buildings.push(newEnt);
                    }

                    // if this constructed building is a field, add it to the farm list
                    if (newEnt.hasClass("Field"))
                        this.allFarms.push(newEnt);

                    // if this constructed building is a civil center, add it to the civil center list
                    if (newEnt.hasClass("CivilCentre"))
                        this.allCivilCentres.push(newEnt);

                    // if this constructed building is a market, add to the market list and reset route
                    if (newEnt.hasClass("Market")) {
                        this.allMarkets.push(newEnt);
                        this.SetMarketRoute(); // new market, check if we can get a more advantageous route
                    }

                    // when the TerritoryInfluence of a building reaches above the threshold of 60 refresh the map of owned and non owned tiles for buildings to utilize in the future
                    if (influence) {
                        if (influence >= 60)
                        {
                            this.allInfluenceEntities.push(newEnt);
                            newEnt.influence = influence;
                            this.RefreshResourceLists(gameState);
                        }
                    }

                    if (newEnt.get("ResourceDropsite")) {
                        // if this constructed building is a dropsite, add it to the specific dropsite lists based on which types are supported by this dropsite
                        for (let resourceType of newEnt.resourceDropsiteTypes()) {
                            this.allDropsites[resourceType].push(newEnt);
                            if (influence == undefined || influence < 60) // dont call refresh if it was already done by the influence section
                                this.RefreshResourceLists(gameState);
                        }
                    }
                }
            }

            if (gameState.isPlayerEnemy(evt.to))
            {
                if (ent.hasClass("CivilCentre"))
                    this.allEnemyCivilCentres[ent.owner()].push(ent);
            }
        }

        // callback event when a tech finishes research ("player" = Player ID, "tech" = tech name, "template" = tech template)
        for (let evt of events.ResearchFinished)
        {
            // check if this tech was researched by us
            if (evt.player != PlayerID || !evt.template.modifications)
                continue;

            // check if any modification of this researched tech edits the influence of an entity and if so, call the influenceChange function
            for (let modification of evt.template.modifications)
            {
                if (modification.value.startsWith("Territory"))
                    this.CheckInfluenceChange(gameState);

                if (modification.value.startsWith("Promotion") && modification.replace == 0)
                {
                    // update the affected classes with the newly promoted unit(s)
                    // can either be from the template affected section, or the 'affects' parameter inside the modification itself
                    if (evt.template.affects != undefined)
                        this.PromoteTrainableUnits(evt.template.affects, gameState); 
                    else if (modification.affects != undefined)
                        this.PromoteTrainableUnits([modification.affects], gameState); 
                }

                if (modification.value.startsWith("ResourceGatherer")) // Refresh sorted resources if their values was changed
                    this.RefreshSortedResources();
            }

            this.currentPhase = gameState.currentPhase(); // update current phase
            // recheck facilities after they have been potentially promoted by the PromoteTrainableUnits function to prevent duplicate trainData
            for (let facility of this.allTrainingFacilities)
                this.CheckTrainableUnits(facility, gameState); // update the existing training facilities with potential new entities

            // remove the researched tech from the tech config list
            let configData = this.configData["Techs"];
            for (let i = 0; i < configData.length; i++)
            {
                let techData = configData[i];
                if (techData.name == evt.tech) {
                    configData.splice(i, 1);
                    break;
                }
            }
        }

        for (let evt of events.TerritoryDecayChanged)
        {
        }

        // called whenever something is being attacked or captured
        // "attacker" = attackerID, "target" = targetID, "type" = (Capture, Slaughter, Melee, Ranged), "damage" = final damage dealt, "attackerOwner" = ownerID
        for (let evt of events.Attacked)
        {
            let victim = gameState.getEntityById(evt.target);
            if (victim == undefined || victim.owner() != PlayerID) // the victim of the damage has to be from this AI to consider defending
                continue;

            if (this.soldierState == 2) // if already defending, attempt to refresh the defending target
            {
                if (victim.ignoreDefence != undefined) // ignore this unit when attacked (mostly for livestock)
                    continue;

                let attacker = gameState.getEntityById(evt.attacker);
                // defending against structures is counter productive because they could remain in the list for infinity and cause the AI to knock their heads against a wall
                if (attacker == undefined || attacker.hasClass("Unit") == false)
                    continue;

                // if our unit is not in its own territory or if the attacker is in its own territory, ignore defending and wait for an opportunity to attack instead
                // the attacker being inside its own territory while assaulting the victim in its own borders can occur when 2 enemy territories collide with each other
                if (this.IsInOwnTerritory(victim) == false || this.IsInEnemyTerritory(attacker, false)) 
                    continue;

                let existingData = this.defendingData.get(evt.attacker); // if this ent already has an entry, only update its checkpoint
                if (existingData == undefined)
                    this.defendingData.set(evt.attacker, { "checkpoint": attacker.position(), "target": attacker, "owner": evt.attackerOwner });
                else
                    existingData.checkpoint = attacker.position();
                ////error("refresh defending " + this.defendingData.get(evt.attacker).target + " player " + PlayerID);
                break; // only get a single target every iteration, break here
            }

            // we are not defending yet, check if we should ignore this unit being attacked (currently for soldiers and livestock)
            if (victim.ignoreDefence != undefined)
                continue;

            let attacker = gameState.getEntityById(evt.attacker);
            if (attacker == undefined || attacker.hasClass("Unit") == false)
                continue;

            // if our unit is not in its own territory or if the attacker is in its own territory, ignore defending and wait for an opportunity to attack instead
            if (this.IsInOwnTerritory(victim) == false || this.IsInEnemyTerritory(attacker, false)) 
                continue;

            let attackerOwner = evt.attackerOwner;
            let checkpoint = attacker.position();
            // attacker has been identified and the victim is something other than a soldier so set defence state and gather information
            this.defendingData.set(evt.attacker, { "checkpoint": checkpoint, "target": attacker, "owner": attackerOwner });
            this.UpdateList(this.allSoldiers);

            //error("start defending " + this.defendingData.get(evt.attacker).target + " player " + PlayerID);
            for (let soldier of this.RunAsBattalion(this.allSoldiers))
            {
                soldier.setStance("aggressive");
                soldier.attackMove(checkpoint[0], checkpoint[1], undefined, false);
            }

            // only send help request dialog if the attacker was non gaia
            if (attackerOwner != 0) 
            { // if non gaia, send attackerOwner name as the text (so index = 1), and attackerOwner color as the color (so index 2)
                let playerData = gameState.sharedScript.playersData[attackerOwner];
                let color = playerData.color;
                gameState.SendAIDialog(gameState.ai.HQ.allAllies, "HelpRequest", this.AIDialogData, 0, { "meta1": [playerData.name, 1], "meta2": [color.r * 255 + " " + color.g * 255 + " " + color.b * 255, 2] });
            }

            this.soldierState = 2; // set state to defending
            break;
        }
    };

    /** Called by any "phase" research plan once it's started */
    m.HQ.prototype.OnPhaseUp = function (gameState, phase) {
    };

    //  #############################################################
    //  TRAINING & RECRUITING
    //  #############################################################

    // check whether this unit already has existing training data, including its promotion and add the building if found
    m.HQ.prototype.IsNewUnit = function (path, template, ent, newBuilding = true)
    {
        for (let element in this.trainableUnits)
        {
            for (let data of this.trainableUnits[element])
            {
                // if either the path or the promoted path already exists in the training data, add the building and return false
                // the promoted path has to be checked, because otherwise the addition of a new building will add this building to the old unpromoted path
                // essentially creating new training data that conflicts with its promotion update
                if (path == data["path"] || template.promotion() == data["path"])
                {
                    if (newBuilding == true) { 
                        data["buildings"].push(ent); // add this new building to the building pool of the train data
                        ent.trainableEnts.push({ "path": path, "template": template }); // let the new building know it can train this entity
                    }
                    return false;
                }
            }
        }
        return true;
    }

    // add potentially new trainable units from an entity to the Trainable Units List
    m.HQ.prototype.AddTrainableUnits = function (ent, gameState)
    {
        let trainable = ent.GetTrainableEnts();
        if (trainable.length < 1)
            return;

        this.allTrainingFacilities.push(ent);
        ent.trainableEnts = [];
        for (let path of trainable)
        {
            let template = gameState.getTemplate(path);
            if (!template)
                continue;

            if (this.IsNewUnit(path, template, ent) == false)
                continue;

            // Check if this template is available
            if (!template.available(gameState)) 
                continue;

            ent.trainableEnts.push({ "path": path, "template": template });
            this.AddToTrainableList({ "path": path, "template": template, "buildings": [ent] });
        }
    }

    // add potentially new trainable units that were just enabled by a tech
    m.HQ.prototype.CheckTrainableUnits = function (ent, gameState)
    {
        let trainable = ent.GetTrainableEnts();
        for (let path of trainable) {
            let template = gameState.getTemplate(path);
            if (!template)
                continue;

            if (this.IsNewUnit(path, template, ent, false) == false) // run with newBuilding parameter set to false because this is a recheck
                continue;

            // Check if this template is now available
            if (!template.available(gameState))
                continue;

            ent.trainableEnts.push({ "path": path, "template": template });
            this.AddToTrainableList({ "path": path, "template": template, "buildings": [ent] });
        }
    }

    // Add trainable units to the proper category list
    m.HQ.prototype.AddToTrainableList = function (data)
    {
        let template = data["template"];
        if (template.hasClass("FemaleCitizen"))
            this.trainableUnits["Citizens"].push(data);
        else if (template.hasClass("Trader"))
            this.trainableUnits["Trader"].push(data);
        else if (template.hasClass("Hero"))
            this.trainableUnits["Hero"].push(data);
        else if (template.hasClass("Titan"))
            this.trainableUnits["Titan"].push(data);
        else
            this.trainableUnits["Other"].push(data);
    }

    // Update trainable units if they are affected by this technology
    m.HQ.prototype.PromoteTrainableUnits = function (affects, gameState)
    {
        // loop over all the trainable units and their data
        for (let type in this.trainableUnits) {
            for (let trainData of this.trainableUnits[type]) {
                for (let unitClass of affects) // loop over the array of affected classes by the researched tech
                {
                    if (trainData.template.hasClass(unitClass)) {
                        let promotionPath = trainData.template.promotion(); // if this trainable unit contains an affected class, update its path and template with the new promotion data
                        if (promotionPath != undefined)
                        {
                            //warn("update trainable from " + trainData.path + " to " + promotionPath);
                            let promotionTemplate = gameState.getTemplate(promotionPath);

                            for (let building of trainData.buildings)
                            {
                                for (let data of building.trainableEnts)
                                {
                                    if (data.path == trainData.path) // check against the train data path before it is updated into the promotion path
                                    {
                                        data.path = promotionPath;
                                        data.template = promotionTemplate;
                                        break;
                                    }
                                }
                            }

                            trainData.path = promotionPath;                           
                            trainData.template = promotionTemplate;
                        }
                    }
                }
            }
        }
    }

    // train trader units when the limit hasnt been reached yet
    m.HQ.prototype.TrainTraders = function (gameState)
    {
        this.UpdateList(this.allMarkets);
        if (this.allMarkets.length < 2)
            return; // not enough markets to trade, dont recruit traders

        let configData = this.configData["TraderPercentage"];
        this.UpdateList(this.allTraders);
        let limitPop = gameState.getPopulationLimit();
        let requiredTraders = Math.round(limitPop * configData[0]);
        if (this.allTraders.length >= configData[1]) // if the AI has reached the min number of desired traders, check the other thresholds, otherwise, ignore those
        {
            if (this.allTraders.length >= configData[2]) // hardcap on traders
                return;

            if (this.allTraders.length >= requiredTraders) // check if we have passed the limit pop set in the configdata
                return;
        }

        let randomTrader = pickRandom(this.trainableUnits["Trader"]);
        if (randomTrader == undefined)
            return; //probably no market yet, so cant train a trader yet 

        let randomTemplate = randomTrader["template"];
        this.UpdateList(randomTrader.buildings);
        let selectedBuilding = undefined;
        let lowestLength = Number.MAX_SAFE_INTEGER;

        for (let facility of randomTrader.buildings)
        {
            let queue = facility.trainingQueue();
            if (!queue)
                continue;

            let length = queue.length;
            if (length > 1)
                continue;

            for (let queuedObject of queue) // loop over all objects/templates trained by this facility
            {
                if (!queuedObject.unitTemplate)
                    continue;

                let template = gameState.getTemplate(queuedObject.unitTemplate);
                if (template.genericName() == randomTemplate.genericName())
                    requiredTraders -= queuedObject.count;
            }

            if (length < lowestLength) // select the building with the lowest queue length
            {
                lowestLength = length;
                selectedBuilding = facility;
            }
        }

        if (selectedBuilding == undefined) // if the queue length is above the threshold, no building will be selected, so return
            return;

        if (this.allTraders.length >= requiredTraders) // check if we have passed the limit pop set in the configdata after checking the 
            return;

        let resources = this.GetResourceData(gameState);

        if (!this.CanAfford(resources, randomTemplate))
            return;

        selectedBuilding.trainHC(randomTrader["path"], 1);
    }

    // train citizen units when the limit hasnt been reached yet
    m.HQ.prototype.TrainCitizens = function (gameState)
    {
        let configData = this.configData["CitizenPercentage"];
        this.UpdateList(this.allCitizens);
        let citizenBattalions = this.GetBattalionCount(this.allCitizens);
        if (citizenBattalions > configData[2]) // hardcap on citizens
            return;

        let limitPop = gameState.getPopulationLimit();
        let requiredWorkers = Math.round(limitPop * configData[0]);

        if (citizenBattalions > configData[1]) // we want at least this number of citizens regardless
            if (citizenBattalions >= requiredWorkers) // check if we have passed the limit pop set in the configdata
                return;

        let randomCitizen = pickRandom(this.trainableUnits["Citizens"]);
        if (randomCitizen == undefined)
            return; //probably no center left, so return

        let randomTemplate = randomCitizen["template"];
        this.UpdateList(randomCitizen.buildings);
        let totalQueued = 0;

        let selectedBuilding = undefined;
        let lowestLength = Number.MAX_SAFE_INTEGER;
        for (let facility of randomCitizen.buildings)
        {
            let queue = facility.trainingQueue();
            if (!queue)
                continue;

            let length = queue.length;
            for (let queuedObject of queue) // loop over all objects/templates trained by this facility
            {
                if (!queuedObject.unitTemplate)
                    continue;

                let template = gameState.getTemplate(queuedObject.unitTemplate);
                if (template.hasClass("FemaleCitizen"))
                    totalQueued += queuedObject.batchCount;
            }

            if (length < 2 && length < lowestLength) // select the building with the lowest queue length with at least a lower value than 2
            {
                lowestLength = length;
                selectedBuilding = facility;
            }
        }

        if (selectedBuilding == undefined)
            return; // no building found with a queue length lower than 3, so return

        if (citizenBattalions + totalQueued > configData[2]) // recheck hardcap on citizens after queue number check
            return;

        if (citizenBattalions > (configData[1] - totalQueued)) // we want at least this number of citizens regardless
            if (citizenBattalions >= (requiredWorkers - totalQueued)) // check if we have passed the limit pop set in the configdata
                return;

        let resources = this.GetResourceData(gameState);    
        if (!this.CanAfford(resources, randomTemplate))
            return;

        //No need to check for batchcount anymore
        selectedBuilding.trainHC(randomCitizen["path"], 1);
    }

    // train militia units when the limit hasnt been reached yet (DISABLED FOR NOW)
    m.HQ.prototype.TrainMilitia = function (gameState)
    {
        let configData = this.configData["MilitiaPercentage"];
        this.UpdateList(this.allMilitia);
        if (this.allMilitia.length > configData[2]) // hardcap on Militia
            return;

        let limitPop = gameState.getPopulationLimit();
        let requiredMilitia = Math.round(limitPop * configData[0]);

        if (this.allMilitia.length > configData[1]) // we want at least this number of militia regardless
            if (this.allMilitia.length >= requiredMilitia) // check if we have passed the limit pop set in the configdata
                return;

        let randomMilitia = pickRandom(this.trainableUnits["Militia"]);
        if (randomMilitia == undefined)
            return; //probably no center left, so return

        let randomTemplate = randomMilitia["template"];
        this.UpdateList(randomMilitia.buildings);
        let totalQueued = 0;

        let selectedBuilding = undefined;
        let lowestLength = Number.MAX_SAFE_INTEGER;
        for (let facility of randomMilitia.buildings)
        {
            let queue = facility.trainingQueue();
            if (!queue)
                continue;

            let length = queue.length;
            for (let queuedObject of queue) // loop over all objects/templates trained by this facility
            {
                if (!queuedObject.unitTemplate)
                    continue;

                let template = gameState.getTemplate(queuedObject.unitTemplate);
                if (template.hasClass("CitizenSoldier"))
                    totalQueued += queuedObject.count;
            }

            if (length < lowestLength) // select the building with the lowest queue length
            {
                lowestLength = length;
                selectedBuilding = facility;
            }
        }

        if (this.allMilitia.length > (configData[1] - totalQueued)) // we want at least this number of militia regardless
            if (this.allMilitia.length >= (requiredMilitia - totalQueued)) // check if we have passed the limit pop set in the configdata
                return;

        let resources = this.GetResourceData(gameState);
        let batchTrain = 1;

        let battalionSize = randomTemplate.BattalionSize();
        if (!this.CanAfford(resources, randomTemplate, batchTrain))
            return;

        if (battalionSize < 5)
        {
            batchTrain = Number.MAX_SAFE_INTEGER;
            for (let resourceType of Resources.GetCodes()) // get the highest batch possibly using the cost of this template and the amount of resources available
            {
                let cost = randomTemplate.get("Cost/Resources/" + resourceType);
                if (cost == 0)
                    continue;

                let possibleAmount = Math.floor((resources[resourceType] / (cost)));
                if (possibleAmount < batchTrain)
                    batchTrain = possibleAmount;
            }

            ////error("batch " + batchTrain + " path " + randomMilitia["path"]);
            if (batchTrain > 6)
                batchTrain = 6; // set max batch train to 6 if the amount possible is too high
        }

        selectedBuilding.trainHC(randomMilitia["path"], batchTrain);
    }

    // train heroes
    m.HQ.prototype.TrainHero = function (gameState, resources)
    {
        let currentPop = gameState.getPopulation();
        let trainableHeroes = this.trainableUnits["Hero"];
        if (trainableHeroes.length < 1) // no available heroes, return
            return false;

        let heroList = [];
        for (let hero of trainableHeroes) // clone the hero list for later use
            heroList.push(hero);

        // get the number of heroes queued, The actual hero buildings selected shouldnt matter in this case, since all heroes are trained from the same facility
        for (let facility of trainableHeroes[0].buildings) {
            let queue = facility.trainingQueue();
            if (!queue)
                continue;

            for (let queuedObject of queue) // loop over all objects/templates trained by this facility
            {
                if (!queuedObject.unitTemplate)
                    continue;

                let template = gameState.getTemplate(queuedObject.unitTemplate);
                if (template.hasClass("Hero"))
                    return false; // already training a hero, dont train another at the same time
            }
        }

        this.UpdateList(this.allHeroes); // update the heroes list first
        if (trainableHeroes.length > 0 && this.allHeroes.length < 3) // if a hero could be trained and the heroes list is still below 3, attempt to recruit one
        {
            if (currentPop >= this.configData["HeroMinPop"][this.allHeroes.length]) // if the ai hasnt reached the population threshold dont set the hero
            {
                for (let i = 0; i < trainableHeroes.length; i++) {
                    let randIndex = randIntExclusive(+0, +heroList.length); // get a random index from the indices that have to be checked from the trainable hero list
                    let hero = heroList[randIndex]; // get the random value index that we still need to check for the trainable hero list
                    heroList.splice(randIndex, 1); //after the random index has been used for assignment, splice it from the potential hero list so it wont be checked again

                    let template = hero["template"]; 
                    if (!this.CanAfford(resources, template)) // cant afford this hero, try the next one
                        continue;

                    let unitList = this.allUnits[template.genericName()];
                    if (unitList != undefined) {
                        this.UpdateList(unitList); // update the list before checking
                        if (unitList.length < 1) // if there is no hero with this name on the field, recruit it
                        {
                            pickRandom(hero["buildings"]).trainHC(hero["path"], 1);
                            return true; // found hero, return true
                        }
                        else // if this hero already exists, try to train the next one
                            continue;
                    }
                    else // if the specific list doesnt exist, this is the first training attempt, so no need to check for length
                    {
                        pickRandom(hero["buildings"]).trainHC(hero["path"], 1);
                        return true; // found hero, return true
                    }
                }
            }
        }

        return false; // couldnt train a hero, return false
    };

    // train the titan
    m.HQ.prototype.TrainTitan = function (resources)
    {
        let titan = this.trainableUnits["Titan"][0];
        if (!titan)
            return false;

        let template = titan["template"];
        if (!this.CanAfford(resources, template))
            return false; // cant afford the titan yet, return

        let unitList = this.allUnits[template.genericName()];
        if (unitList != undefined) {
            this.UpdateList(unitList); // update the list before checking
            if (unitList.length < 1) // if there is no titan with this name on the field make a titan
                pickRandom(titan["buildings"]).trainHC(titan["path"], 1);
        }
        else // if the specific list doesnt exist, this is the first training attempt, so no need to check for length          
            pickRandom(titan["buildings"]).trainHC(titan["path"], 1);
    }

    // returns a list of potential buildings and trainables based upon the training type provided and the queue length of the available buildings
    m.HQ.prototype.GetPotentialTrainingData = function (trainingType)
    {
        let availableBuildings = new Map(); // all available recruitment buildings
        let potentialTrainable = new Map(); // contains all the potential unit training data
        let trainableList = this.trainableUnits[trainingType];

        for (let trainable of trainableList) // cache the available buildings that can train units
        {
            this.UpdateList(trainable.buildings);
            potentialTrainable.set(trainable.path, trainable);
            for (let facility of trainable.buildings) {
                if (availableBuildings.has(facility.id()) == false) // ignore duplicate building ID's
                    availableBuildings.set(facility.id(), facility);
            }
        }

        let lowest = Number.MAX_SAFE_INTEGER;
        let potentialBuildings = [];
        for (let facility of availableBuildings.values()) // loop over the available recruitment facilities to get the buildings with the lowest production queue length
        {
            let queueLength = facility.trainingQueue().length;
            if (queueLength <= lowest && queueLength < 2) // we want to have a list with the lowest queue buildings with a max queue length of 2
            {
                if (queueLength != lowest) // if lowest has changed, we have to refill the potential list with the buildings that have the same queue length
                    potentialBuildings.length = 0; // new lowest number has been found, clear the potential list

                lowest = queueLength;
                potentialBuildings.push(facility); // found current lowest setting, add this building for potential recruitment
            }
        }

        return { "buildings": potentialBuildings, "trainable": potentialTrainable };
    }

   // train any non citizen unit based on multiple factors
    m.HQ.prototype.TrainUnits = function (gameState)
    {
        let resources = this.GetResourceData(gameState);    
        let batchTrain = 1;

        let chosenTrainable = null;
        let chosenTemplate = null; 
        let chosenBuilding = null;

        this.UpdateList(this.allTrainingFacilities);     
        let potentialData = this.GetPotentialTrainingData("Other"); // get the potential data, containing the usable buildings and trainable data

        let Indices = [];
        for (let i = 0; i < potentialData.buildings.length; i++) // cache indices that have to be checked during the random sets later
            Indices.push(i);

        while (true) // check random units until one can be used or all potential units have been checked
        {
            if (Indices.length < 1)
                return; // if we have checked all possible buildings and none is trainable, dont train anything

            let randIndex = randIntExclusive(+0, +Indices.length); // get a random index from the indices that have to be checked from the trainable units list
            let randValue = Indices[randIndex]; // get the random value index that we still need to check for the trainable units list
            chosenBuilding = potentialData.buildings[randValue]; // choose a random building from the Indices check list
            let potentialUnits = [];

            for (let unit of chosenBuilding.trainableEnts) // make sure that only the soldier types are considered for training
            {
                let unitData = potentialData.trainable.get(unit.path);
                if (unitData != undefined)
                    potentialUnits.push(unitData); // add the unitdata from the original trainable list instead of the chosenbuildings trainable ents data
            }
            chosenTrainable = pickRandom(potentialUnits); // pick random trainable data from the filtered potential unit list that can be trained by this chosen building
            chosenTemplate = chosenTrainable.template;

            let max = chosenTemplate.AIMaxCopies();
            if (!max || max > 0) // if the max == 0, dont attempt to train at all
            {
                let unitList = this.allUnits[chosenTemplate.genericName()];
                if (unitList) {
                    this.UpdateList(unitList);
                    var battalionList = this.GetBattalionCount(unitList);
                    // only run if a max has been set for this unit, and the current length on the field is lower than that
                    // the only possible obstacle could be because that unit is already in training, which isnt taken into account yet by the unit list
                    if (max && battalionList < max) {
                        for (let facility of chosenTrainable.buildings) {
                            for (let queuedObject of facility.trainingQueue()) // loop over all objects/templates trained by this facility
                            {
                                if (!queuedObject.unitTemplate)
                                    continue;

                                let template = gameState.getTemplate(queuedObject.unitTemplate);
                                if (template.genericName() == chosenTemplate.genericName()) // check the name of the unit
                                    max -= queuedObject.batchCount;
                            }
                        }
                    }
                }
                if (!unitList || !max || battalionList < max) // make sure this trainable unit doesnt exceed the max copy limit if it exists
                {
                    if (this.CanAfford(resources, chosenTemplate, batchTrain))
                        break; // found affordable and usable training data, attempt to train down below
                }
            }

            Indices.splice(randIndex, 1); // this index has been checked so remove it from the list
        }

        let totalQueueResources = {};
        for (let facility of this.allTrainingFacilities)
        {
            for (let queuedObject of facility.trainingQueue()) // loop over all objects/templates trained by this facility
            {
                if (queuedObject.unitTemplate == undefined)  // this can be undefined with elements like techs
                    continue;

                let template = gameState.getTemplate(queuedObject.unitTemplate);
                if (template == undefined || template.hasClass("Hero") == true || template.hasClass("Titan") == true
                    || template.hasClass("FemaleCitizen") == true || template.hasClass("Trader") == true)
                    continue; // we only want to account for total soldier cost

                for (let resourceType in queuedObject.resources) // loop over all resources used for this object in training
                {
                    let objectCost = queuedObject.resources[resourceType];
                    if (objectCost > 0) // only add this resource to the total if its higher than 0
                    {
                        if (!totalQueueResources[resourceType]) // declare the resource type for the totalqueue if not present yet
                            totalQueueResources[resourceType] = 0;

                        let total = objectCost; // cost is now based upon the entire battalion rather than per entity
                        totalQueueResources[resourceType] += total;
                    }
                }
            }
        }

        for (let resourceType in totalQueueResources) // check every resource type contained within the totalqueue (mostly just food and metal probably)
        {
            let limit = resources[resourceType] / totalQueueResources[resourceType];
            if (limit < (1 * this.difficultyRatio)) // the total resources need to be at least 100% * the difficulty ratio of the resources currently used in training 
                return;
        }

        chosenBuilding.trainHC(chosenTrainable["path"], batchTrain);
    };

    //  #############################################################
    //  ATTACKING & DEFENDING
    //  #############################################################

    // returns whether this army has at least the ratio of the enemies soldiers in percentage (1.0 = 100%)
    m.HQ.prototype.HasSoldierRatio = function (enemySoldiers, ratio)
    {
        if (this.GetBattalionCount(this.allSoldiers) / this.GetBattalionCount(enemySoldiers) < ratio) // at least ratio% of the enemies forces is required to attack them
            return false;
        else
            return true;
    }

    // Select a random civil center from this enemy player ID if it exists, otherwise, try to find another structure or unit that still remains
    m.HQ.prototype.GetRandomEnemyTarget = function (gameState, enemyID)
    {
        let civilCenters = this.allEnemyCivilCentres[enemyID];
        this.UpdateList(civilCenters, enemyID); //update this list taking the removal set of this enemyID into account
        if (civilCenters.length > 0)
        {
            let randCentre = randIntExclusive(+0, +civilCenters.length);
            return civilCenters[randCentre];
        }

        let remainingEntity = this.GetRemainingEnemyEntity(gameState, enemyID);
        if (remainingEntity != undefined) // no civil center found, try to find another structure or unit that still exists for this enemy ID
            return remainingEntity;

        return undefined;
    }

    // find remaining entities for when civil centres are no longer available
    m.HQ.prototype.GetRemainingEnemyEntity = function (gameState, enemyID)
    {
        let structure = gameState.getEnemyStructures(enemyID).toEntityArray()[0];
        if (structure != undefined)
            return structure;

        let unit = gameState.getEnemyUnits(enemyID).toEntityArray()[0];
        if (unit != undefined)
            return unit;

        this.allEnemies = gameState.getEnemies(); // update the enemy list when no entities remain from this player
        return undefined;
    }

    m.HQ.prototype.GetRandomEnemy = function (withGaia = false)
    {
        let tempList = [];
        for (let enemy of this.allEnemies)
        {
            if (withGaia == false && enemy == 0) // we dont want to take the gaia player into account
                continue;

            tempList.push(enemy);
        }

        let rand = randIntExclusive(+0, +tempList.length);
        return tempList[rand];
    }

    // return the average position from an entity selection/list
    m.HQ.prototype.GetAveragePos = function (entities)
    {
        if (entities.length < 1)
            return undefined;

        let sumResult = [0, 0];
        for (let ent of entities) // add all the X and Z values together into the sum array
        {
            let pos = ent.position();
            for (let i = 0; i < 2; i++)
                sumResult[i] += pos[i];
        }

        for (let i = 0; i < 2; i++)
            sumResult[i] = Math.round(sumResult[i] / entities.length); // divide by the length to get the average

        return sumResult; // return the result
    }

    // return whether this unit is located inside enemy territory
    m.HQ.prototype.IsInEnemyTerritory = function (ent, withGaia = true)
    {
        let tile = this.GetTileNumber(ent.position(), this.territoryMap); // get the tile this entity is located on
        let tileOwner = this.TileOwners.get(tile); // get the owner of this tile

        if (tileOwner == undefined) // make sure this tile exists
            return false;

        for (let enemy of this.allEnemies)
        {
            if (withGaia == false && enemy == 0) // in case we dont want the gaia (aka neutral) territory to be included
                continue;

            if (tileOwner == enemy)
                return true; // this tile belongs to an enemy, return true
        }
        return false; // this tile doesnt belong to an enemy, return false
    }

    // return whether this entity is located inside its own territory
    m.HQ.prototype.IsInOwnTerritory = function (ent)
    {
        let tile = this.GetTileNumber(ent.position(), this.territoryMap); // get the tile this entity is located on
        let tileOwner = this.TileOwners.get(tile); // get the owner of this tile

        if (tileOwner == undefined) // make sure this tile exists
            return false;

        if (tileOwner == PlayerID)
            return true; // this tile belongs to this player, return true

        return false; // this tile doesnt belong to this player, return false
    }

    // return a specified number of checkpoints between 2 locations
    m.HQ.prototype.GetCheckPoints = function (gameState, startPos, endPos, number)
    {
        let checkpoints = {};
        let delta = []; // the change in X and Z for every checkpoint
        let checkpointAmount = number + 1; // if a return of 1 checkpoint was specified, a division by that value +1 is required for the calculation to make sense

        // use the start location or the civil centre location when still present
        let civilStartPos = this.GetCivilLocation();

        let startAccess = gameState.ai.accessibility.getAccessValue(civilStartPos);
        if (gameState.ai.accessibility.getAccessValue(startPos) != startAccess) { 
            startPos = civilStartPos; // if the given start position is not located on land like the civil centre, set the startpos to the civil location
        }

        for (let i = 0; i < 2; i++)
            delta[i] = Math.round((endPos[i] - startPos[i]) / checkpointAmount); // calculate deltaX and deltaZ based upon the end and start pos

        for (let i = 1; i < checkpointAmount; i++) // create the checkpoint list running from checkpoint number 1 to x, adding the delta for every iteration
        {
            let newX = startPos[0] + (delta[0] * i);
            let newZ = startPos[1] + (delta[1] * i);

            let access = gameState.ai.accessibility.getAccessValue([newX, newZ]);
            if (access != startAccess) // if the checkpoint doesnt equal that of the start access(so basically land), backtrack toward the start position until the checkpoint is located on the same access type
            {
                let count = 0;
                while (access != startAccess) {
                    count += 0.1; // add 10% of the full delta to try close to 10 positions per checkpoint distance
                    access = gameState.ai.accessibility.getAccessValue([newX - (count * delta[0]), newZ - (count * delta[1])]);
                }
                checkpoints[i] = [newX - (count * delta[0]), newZ - (count * delta[1])];
            }
            else
                checkpoints[i] = [newX, newZ];
        }

        checkpoints[checkpointAmount] = endPos; // add the endpos at the end, since it is the final checkpoint
        return checkpoints; // return the object that contains all the checkpoints
    }

    // move a selected list of entities to the current checkpoint in attack move motion
    m.HQ.prototype.MoveToCurrentCheckpoint = function (entities, forceMove = false, canCapture = false)
    {
        //error("move to checkpoint for player " + PlayerID + " forcemove " + forceMove);
        if (forceMove == true) // there will be occasions when we want to give a move command regardless of idle state
        {
            for (let entity of this.RunAsBattalion(entities))
                entity.attackMove(this.checkpoints[this.currentCheckpoint][0], this.checkpoints[this.currentCheckpoint][1], undefined, canCapture);
        }
        else
        {
            for (let entity of this.RunAsBattalion(entities))
            {
                if (entity.isIdle()) // we dont need to give another attack command, if the entity is already executing another command
                    entity.attackMove(this.checkpoints[this.currentCheckpoint][0], this.checkpoints[this.currentCheckpoint][1], undefined, canCapture);
            }
        }
    }

    // set final checkpoint state when we have reached the end goal
    m.HQ.prototype.SetFinalCheckPoint = function ()
    {
        for (let soldier of this.RunAsBattalion(this.allSoldiers))
            soldier.setStance("violent");

        this.MoveToCurrentCheckpoint(this.allSoldiers, true);
    }

    // if we have reached enemy territory with one of the soldiers, skip to the final checkpoint state
    m.HQ.prototype.ReachedEnemyTerritoryBehaviour = function ()
    {
        for (let soldier of this.allSoldiers)
        {
            if (this.IsInEnemyTerritory(soldier, false) == true) // set gaia to false, because we are specifically looking for actual enemy territory
            {
                while (this.checkpoints[this.currentCheckpoint + 1] != undefined)
                    this.currentCheckpoint += 1; // keep incrementing until we reach the final checkpoint

                this.SetFinalCheckPoint(); // call end state
                //error("set to final state");
                return true;
            }
        }

        return false; // no soldier was found in target territory (or other enemy player territory)
    }

    m.HQ.prototype.MoveToNextCheckpoint = function (gameState)
    {
        if (this.soldierState != 1)
            return;

        if (this.checkpoints[this.currentCheckpoint + 1] == undefined) // we have reached the end goal
        {
            this.MoveToCurrentCheckpoint(this.allSoldiers);
            return;
        }     

        if (this.ReachedEnemyTerritoryBehaviour() == true) // if we have reached enemy territory, skip to final state and return
            return;

        let currentAveragePos = this.GetAveragePos(this.allSoldiers);
        let currentToCheckpointDist = API3.SquareVectorDistance(currentAveragePos, this.checkpoints[this.currentCheckpoint]);
        let distThreshold = this.allSoldiers.length * 2; // how close the group of units should be to continue
        if (currentToCheckpointDist > distThreshold * distThreshold) // too far away from the current checkpoint, check time threshold next
        {
            if (gameState.ai.elapsedTime < this.checkpointTimeThreshold) { // the time threshold also hasnt been reached yet, give new move command to current checkpoint
                this.MoveToCurrentCheckpoint(this.allSoldiers);
                return;
            }
        }           

        // Checks cleared, increment to next checkpoint
        // set the threshold to the distance * 0.2, meaning the battalions get to simulate as if their movement speed is 5 walkspeed per second
        // this should give those battalions more than enough time to gather up
        // this will also prevent the endless waiting for newly created battalions which werent taken into account at this point in time
        this.checkpointTimeThreshold = (Math.sqrt(currentToCheckpointDist) * 0.2) + gameState.ai.elapsedTime;
        this.currentCheckpoint += 1;

        if (this.checkpoints[this.currentCheckpoint + 1] == undefined) // we have reached the end goal
            this.SetFinalCheckPoint();
        else
            this.MoveToCurrentCheckpoint(this.allSoldiers, true); // after incrementing to a new checkpoint, give a forced move command
    }

    m.HQ.prototype.Retreat = function ()
    {
        this.soldierState = 0; // this ai doesnt have enough soldiers to continue the attack against this opponent, return to idle state
        let pos = this.GetCivilLocation();

        //error("retreat player " + PlayerID);
        for (let soldier of this.RunAsBattalion(this.allSoldiers))
        {
            soldier.setStance("none");
            soldier.move(pos[0], pos[1]);
        }
    }

    m.HQ.prototype.DefendOrders = function ()
    {
        let data = this.defendingData;
        let chosenData = null;
        for (let targetData of data.values())
        {
            let target = targetData.target;
            if (this.UpdateSingle(target, targetData.owner) == undefined) // if the target has been destroyed, delete this entity from the target list
            {
                data.delete(target.id());
                continue;
            }

            let pos = targetData.target.position();
            if (pos == undefined)
            {
                data.delete(target.id());
                continue;
            }

            let dist = API3.SquareVectorDistance(targetData.target.position(), targetData.checkpoint);
            if (dist > 30 * 30) // if the attackers current location is more than 30 from its registered attack location, also delete the entity
            {
                data.delete(target.id());
                continue;
            }

            chosenData = targetData; // this data is viable so choose this one and break for now
        }

        // if all possible targets are either dead or away from their location, retreat
        if (data.size < 1)
        {
            this.Retreat();
            return;
        }
        //else
            //error("after " + data.size + " chosen " + chosenData.target);

        // checks cleared, tell idle soldiers to attack that location
        let checkpoint = chosenData.checkpoint;
        for (let soldier of this.RunAsBattalion(this.allSoldiers))
        {
            if (this.IsInEnemyTerritory(soldier) == true && this.IsInEnemyTerritory(chosenData.target) == false) // only force move if the target is inside the defenders territory and the defender is outside its own territory
            {
                soldier.move(checkpoint[0], checkpoint[1]); // this soldier is not in friendly territory, force move toward defending checkpoint
                soldier.forcedDefense = true; // this battalion was ordered to force move back to its own territory, reset force move to attack move later
                continue;
            }

            if (soldier.isIdle() || soldier.forcedDefense && this.IsInOwnTerritory(soldier)) // when the battalion is either idle or when a forced defence move was given to this battalion, give it an attack move command
            {
                soldier.attackMove(checkpoint[0], checkpoint[1], undefined, false);
                soldier.forcedDefense = false; // this battalion might have been told to forcibly return, set that state back to false
            }
        }
    }
    
    m.HQ.prototype.StartAttack = function (gameState)
    {
        let soldierBattalions = this.RunAsBattalion(this.allSoldiers);
        if (soldierBattalions.length < 5) // need at least 5 battalions to consider attacking anything
            return;

        let randEnemyID = this.GetRandomEnemy();
        this.UpdateList(this.allEnemySoldiers[randEnemyID], randEnemyID);
        if (this.HasSoldierRatio(this.allEnemySoldiers[randEnemyID], 0.85) == false) // at least 85% of the enemies forces is required to attack them
            return;

        this.attackTarget = this.GetRandomEnemyTarget(gameState, randEnemyID);
        if (this.attackTarget == undefined)
            return;

        let attackTargetPos = this.attackTarget.position();
        ////error("attack " + civilCenters[randCentre]);

        let AverageStartPos = this.GetAveragePos(this.allSoldiers);
        let distToAttackLocation = API3.SquareVectorDistance(AverageStartPos, attackTargetPos);
        ////error("startPos " + AverageStartPos + " endpos " + civilCentrePos);
        let checkpointNumber = Math.ceil(distToAttackLocation / (500 * 500)); // one checkpoint per 500 distance magnitude
        this.checkpoints = this.GetCheckPoints(gameState, AverageStartPos, attackTargetPos, checkpointNumber);
        //for (let element in this.checkpoints)
        //    //error(this.checkpoints[element][0]);

        ////error("start attack against player " + randEnemyID);
        //error("we have " + this.allSoldiers.length + " soldiers against " + this.allEnemySoldiers[randEnemyID].length + " soldiers " + " player " + PlayerID);
        this.currentCheckpoint = 1;
        this.soldierState = 1; // set state to attacking
        this.targetedEnemyID = randEnemyID;

        for (let soldier of soldierBattalions)
            soldier.setStance("defensive");

        this.MoveToCurrentCheckpoint(this.allSoldiers, true);
    }

    // Garrison all the free ranged units in moving objects
    m.HQ.prototype.GarrisonUnits = function (gameState) {
       
        this.garrisonEntities = [];
        let GarrisonedUnits = [];
        gameState.getOwnUnits().forEach(function (ent) {
            if (ent.hasClass("GarrisonClass")) {

                // add units that are already garrisoned to the GarrisonedUnits list so they wont be added to the freeranged units
                for (let garrisonedUnit of ent.garrisoned())
                {
                    GarrisonedUnits.push(garrisonedUnit);
                }

                // add garrisonable units that arent full to the this.garrisonEntities list
                if (gameState.ai.HQ.garrisonManager.numberOfGarrisonedUnits(ent) < ent.garrisonMax()) {
                    gameState.ai.HQ.garrisonEntities.push(ent);
                }
            }
        });

        // dont garrison units if there are no available units that can be garrisoned
        if (this.garrisonEntities.length === 0)
            return;

        // add units that can garrison and arent already garrisoned in another object to the freeranged unit list
        this.freeRangedUnits = [];
        gameState.getOwnUnits().forEach(function (ent) {
            if (ent.hasClass("CanGarrison"))
            {
                // if the unit is still carrying resources return those and dont add it to the free ranged units yet,
                // otherwise check if the unit is already garrisoned and if not, add it to the pool of available units
                if (ent.resourceCarrying() && ent.resourceCarrying().length > 0 )
                {
                    // get the nearest dropsite
                    let nearestDropsite = 0;
                    let lowest = Number.MAX_SAFE_INTEGER;
                    for (let dropsite of gameState.getOwnDropsites().values()) {
                        let dist = API3.SquareVectorDistance(dropsite.position(), ent.position());
                        if (dist < lowest) {
                            lowest = dist;
                            nearestDropsite = dropsite;
                        }
                    }

                    // return resources
                    if (nearestDropsite != 0)
                        ent.returnResources(nearestDropsite);
                }
                else
                {
                    // check if unit is already garrisoned
                    let addUnit = true;
                    for (let garrisonedUnit of GarrisonedUnits) {
                        if (ent.id() === garrisonedUnit) {
                            addUnit = false;
                            break;
                        }
                    }

                    // add unit to the pool if not already garrisoned
                    if (addUnit === true)
                        gameState.ai.HQ.freeRangedUnits.push(ent);
                }
            }
        });

        // dont try to garrison units if there are none available
        if (this.freeRangedUnits.length === 0)
            return;

        // assign free ranged units to available garrisonable units based on the spots left in the garrisonable unit
        for (let entity of this.garrisonEntities)
        {
            let count = entity.garrisoned().length;
            for (let unit of this.freeRangedUnits)
            {
                if (count < entity.garrisonMax())
                {
                    unit.garrison(entity);
                    count++;
                }
                else
                    break;
            }
        }
    }

    /** picks the best template based on parameters and classes */
    m.HQ.prototype.findBestTrainableUnit = function (gameState, classes, requirements) {
        let units;
        if (classes.indexOf("Hero") != -1)
            units = gameState.findTrainableUnits(classes, []);
        else if (classes.indexOf("Siege") != -1)	// We do not want siege tower as AI does not know how to use it
            units = gameState.findTrainableUnits(classes, ["SiegeTower"]);
        else						// We do not want hero when not explicitely specified
            units = gameState.findTrainableUnits(classes, ["Hero"]);

        if (!units.length)
            return undefined;

        let parameters = requirements.slice();
        let remainingResources = this.getTotalResourceLevel(gameState);    // resources (estimation) still gatherable in our territory
        let availableResources = gameState.ai.queueManager.getAvailableResources(gameState); // available (gathered) resources
        for (let type in remainingResources) {
            if (availableResources[type] > 800)
                continue;
            if (remainingResources[type] > 800)
                continue;
            let costsResource = remainingResources[type] > 400 ? 0.6 : 0.2;
            let toAdd = true;
            for (let param of parameters) {
                if (param[0] != "costsResource" || param[2] != type)
                    continue;
                param[1] = Math.min(param[1], costsResource);
                toAdd = false;
                break;
            }
            if (toAdd)
                parameters.push(["costsResource", costsResource, type]);
        }

        units.sort((a, b) => {
            let aCost = 1 + a[1].costSum();
            let bCost = 1 + b[1].costSum();
            let aValue = 0.1;
            let bValue = 0.1;
            for (let param of parameters) {
                if (param[0] == "strength") {
                    aValue += m.getMaxStrength(a[1]) * param[1];
                    bValue += m.getMaxStrength(b[1]) * param[1];
                }
                else if (param[0] == "siegeStrength") {
                    aValue += m.getMaxStrength(a[1], "Structure") * param[1];
                    bValue += m.getMaxStrength(b[1], "Structure") * param[1];
                }
                else if (param[0] == "speed") {
                    aValue += a[1].walkSpeed() * param[1];
                    bValue += b[1].walkSpeed() * param[1];
                }
                else if (param[0] == "costsResource") {
                    // requires a third parameter which is the resource
                    if (a[1].cost()[param[2]])
                        aValue *= param[1];
                    if (b[1].cost()[param[2]])
                        bValue *= param[1];
                }
                else if (param[0] == "canGather") {
                    // checking against wood, could be anything else really.
                    if (a[1].resourceGatherRates() && a[1].resourceGatherRates()["wood.tree"])
                        aValue *= param[1];
                    if (b[1].resourceGatherRates() && b[1].resourceGatherRates()["wood.tree"])
                        bValue *= param[1];
                }
                else
                    API3.warn(" trainMoreUnits avec non prevu " + uneval(param));
            }
            return -aValue / aCost + bValue / bCost;
        });
        return units[0][0];
    };

    /**
     * returns an entity collection of workers through BaseManager.pickBuilders
     * TODO: when same accessIndex, sort by distance
     */
    m.HQ.prototype.bulkPickWorkers = function (gameState, baseRef, number) {
        let accessIndex = baseRef.accessIndex;
        if (!accessIndex)
            return false;
        // sorting bases by whether they are on the same accessindex or not.
        let baseBest = this.baseManagers.slice().sort((a, b) => {
            if (a.accessIndex == accessIndex && b.accessIndex != accessIndex)
                return -1;
            else if (b.accessIndex == accessIndex && a.accessIndex != accessIndex)
                return 1;
            return 0;
        });

        let needed = number;
        let workers = new API3.EntityCollection(gameState.sharedScript);
        for (let base of baseBest) {
            if (base.ID == baseRef.ID)
                continue;
            base.pickBuilders(gameState, workers, needed);
            if (workers.length >= number)
                break;
            needed = number - workers.length;
        }
        if (!workers.length)
            return false;
        return workers;
    };

    m.HQ.prototype.getTotalResourceLevel = function (gameState) {
        let total = {};
        for (let res of Resources.GetCodes())
            total[res] = 0;
        for (let base of this.baseManagers)
            for (let res in total)
                total[res] += base.getResourceLevel(gameState, res);

        return total;
    };

    /**
     * Returns the current gather rate
     * This is not per-se exact, it performs a few adjustments ad-hoc to account for travel distance, stuffs like that.
     */
    m.HQ.prototype.GetCurrentGatherRates = function (gameState) {
        if (!this.turnCache.currentRates) {
            let currentRates = {};
            for (let res of Resources.GetCodes())
                currentRates[res] = 0.5 * this.GetTCResGatherer(res);

            for (let base of this.baseManagers)
                base.addGatherRates(gameState, currentRates);

            for (let res of Resources.GetCodes())
                currentRates[res] = Math.max(currentRates[res], 0);

            this.turnCache.currentRates = currentRates;
        }

        return this.turnCache.currentRates;
    };

    /**
     * Returns the wanted gather rate.
     */
    m.HQ.prototype.GetWantedGatherRates = function (gameState) {
        if (!this.turnCache.wantedRates)
            this.turnCache.wantedRates = gameState.ai.queueManager.wantedGatherRates(gameState);

        return this.turnCache.wantedRates;
    };

    /**
     * Pick the resource which most needs another worker
     * How this works:
     * We get the rates we would want to have to be able to deal with our plans
     * We get our current rates
     * We compare; we pick the one where the discrepancy is highest.
     * Need to balance long-term needs and possible short-term needs.
     */
    m.HQ.prototype.pickMostNeededResources = function (gameState) {
        let wantedRates = this.GetWantedGatherRates(gameState);
        let currentRates = this.GetCurrentGatherRates(gameState);

        let needed = [];
        for (let res in wantedRates)
            needed.push({ "type": res, "wanted": wantedRates[res], "current": currentRates[res] });

        needed.sort((a, b) => {
            if (a.current < a.wanted && b.current < b.wanted) {
                if (a.current && b.current)
                    return b.wanted / b.current - a.wanted / a.current;
                if (a.current)
                    return 1;
                if (b.current)
                    return -1;
                return b.wanted - a.wanted;
            }
            if (a.current < a.wanted || a.wanted && !b.wanted)
                return -1;
            if (b.current < b.wanted || b.wanted && !a.wanted)
                return 1;
            return a.current - a.wanted - b.current + b.wanted;
        });
        return needed;
    };

    /**
     * Returns the best position to build a new Civil Centre
     * Whose primary function would be to reach new resources of type "resource".
     */
    m.HQ.prototype.findEconomicCCLocation = function (gameState, template, resource, proximity, fromStrategic) {
        // This builds a map. The procedure is fairly simple. It adds the resource maps
        //	(which are dynamically updated and are made so that they will facilitate DP placement)
        // Then look for a good spot.

        Engine.ProfileStart("findEconomicCCLocation");

        // obstruction map
        let obstructions = m.createObstructionMap(gameState, 0, template);
        let halfSize = 0;
        if (template.get("Footprint/Square"))
            halfSize = Math.max(+template.get("Footprint/Square/@depth"), +template.get("Footprint/Square/@width")) / 2;
        else if (template.get("Footprint/Circle"))
            halfSize = +template.get("Footprint/Circle/@radius");

        let ccEnts = gameState.updatingGlobalCollection("allCCs", API3.Filters.byClass("CivCentre"));
        let dpEnts = gameState.getOwnDropsites().filter(API3.Filters.not(API3.Filters.byClassesOr(["CivCentre", "Elephant"])));
        let ccList = [];
        for (let cc of ccEnts.values())
            ccList.push({ "ent": cc, "pos": cc.position(), "ally": gameState.isPlayerAlly(cc.owner()) });
        let dpList = [];
        for (let dp of dpEnts.values())
            dpList.push({ "ent": dp, "pos": dp.position(), "territory": this.territoryMap.getOwner(dp.position()) });

        let bestIdx;
        let bestVal;
        let radius = Math.ceil(template.obstructionRadius().max / obstructions.cellSize);
        let scale = 250 * 250;
        let proxyAccess;
        let nbShips = this.navalManager.transportShips.length;
        if (proximity)	// this is our first base
        {
            // if our first base, ensure room around
            radius = Math.ceil((template.obstructionRadius().max + 8) / obstructions.cellSize);
            // scale is the typical scale at which we want to find a location for our first base
            // look for bigger scale if we start from a ship (access < 2) or from a small island
            let cellArea = gameState.getPassabilityMap().cellSize * gameState.getPassabilityMap().cellSize;
            proxyAccess = gameState.ai.accessibility.getAccessValue(proximity);
            if (proxyAccess < 2 || cellArea * gameState.ai.accessibility.regionSize[proxyAccess] < 24000)
                scale = 400 * 400;
        }

        let width = this.territoryMap.width;
        let cellSize = this.territoryMap.cellSize;

        // DistanceSquare cuts to other ccs (bigger or no cuts on inaccessible ccs to allow colonizing other islands).
        let reduce = (template.hasClass("Colony") ? 30 : 0) + 30 * this.Config.personality.defensive;
        let nearbyRejected = Math.square(120);			// Reject if too near from any cc
        let nearbyAllyRejected = Math.square(200);		// Reject if too near from an allied cc
        let nearbyAllyDisfavored = Math.square(250);		// Disfavor if quite near an allied cc
        let maxAccessRejected = Math.square(410);		// Reject if too far from an accessible ally cc
        let maxAccessDisfavored = Math.square(360 - reduce);	// Disfavor if quite far from an accessible ally cc
        let maxNoAccessDisfavored = Math.square(500);		// Disfavor if quite far from an inaccessible ally cc

        let cut = 60;
        if (fromStrategic || proximity)  // be less restrictive
            cut = 30;

        for (let j = 0; j < this.territoryMap.length; ++j) {
            if (this.territoryMap.getOwnerIndex(j) != 0)
                continue;
            // With enough room around to build the cc
            let i = this.territoryMap.getNonObstructedTile(j, radius, obstructions);
            if (i < 0)
                continue;
            // We require that it is accessible
            let index = gameState.ai.accessibility.landPassMap[i];
            if (!this.landRegions[index])
                continue;
            if (proxyAccess && nbShips == 0 && proxyAccess != index)
                continue;

            let norm = 0.5;   // TODO adjust it, knowing that we will sum 5 maps
            // Checking distance to other cc
            let pos = [cellSize * (j % width + 0.5), cellSize * (Math.floor(j / width) + 0.5)];
            // We will be more tolerant for cc around our oversea docks
            let oversea = false;

            if (proximity)	// This is our first cc, let's do it near our units
                norm /= 1 + API3.SquareVectorDistance(proximity, pos) / scale;
            else {
                let minDist = Math.min();
                let accessible = false;

                for (let cc of ccList) {
                    let dist = API3.SquareVectorDistance(cc.pos, pos);
                    if (dist < nearbyRejected) {
                        norm = 0;
                        break;
                    }
                    if (!cc.ally)
                        continue;
                    if (dist < nearbyAllyRejected) {
                        norm = 0;
                        break;
                    }
                    if (dist < nearbyAllyDisfavored)
                        norm *= 0.5;

                    if (dist < minDist)
                        minDist = dist;
                    accessible = accessible || index == m.getLandAccess(gameState, cc.ent);
                }
                if (norm == 0)
                    continue;

                if (accessible && minDist > maxAccessRejected)
                    continue;

                if (minDist > maxAccessDisfavored)     // Disfavor if quite far from any allied cc
                {
                    if (!accessible) {
                        if (minDist > maxNoAccessDisfavored)
                            norm *= 0.5;
                        else
                            norm *= 0.8;
                    }
                    else
                        norm *= 0.5;
                }

                // Not near any of our dropsite, except for oversea docks
                oversea = !accessible && dpList.some(dp => m.getLandAccess(gameState, dp.ent) == index);
                if (!oversea) {
                    for (let dp of dpList) {
                        let dist = API3.SquareVectorDistance(dp.pos, pos);
                        if (dist < 3600) {
                            norm = 0;
                            break;
                        }
                        else if (dist < 6400)
                            norm *= 0.5;
                    }
                }
                if (norm == 0)
                    continue;
            }

            if (this.borderMap.map[j] & m.fullBorder_Mask)	// disfavor the borders of the map
                norm *= 0.5;

            let val = 2 * gameState.sharedScript.ccResourceMaps[resource].map[j];
            for (let res in gameState.sharedScript.resourceMaps)
                if (res != "food")
                    val += gameState.sharedScript.ccResourceMaps[res].map[j];
            val *= norm;

            // If oversea, be just above threshold to be accepted if nothing else 
            if (oversea)
                val = Math.max(val, cut + 0.1);

            if (bestVal !== undefined && val < bestVal)
                continue;
            if (this.isDangerousLocation(gameState, pos, halfSize))
                continue;
            bestVal = val;
            bestIdx = i;
        }

        Engine.ProfileStop();

        if (!bestIdx)
            return false;

        //API3.warn("we have found a base for " + resource + " with best (cut=" + cut + ") = " + bestVal);
        // not good enough.

        let x = (bestIdx % obstructions.width + 0.5) * obstructions.cellSize;
        let z = (Math.floor(bestIdx / obstructions.width) + 0.5) * obstructions.cellSize;

        // Define a minimal number of wanted ships in the seas reaching this new base
        let indexIdx = gameState.ai.accessibility.landPassMap[bestIdx];
        for (let base of this.baseManagers) {
            if (!base.anchor || base.accessIndex == indexIdx)
                continue;
            let sea = this.getSeaBetweenIndices(gameState, base.accessIndex, indexIdx);
            if (sea !== undefined)
                this.navalManager.setMinimalTransportShips(gameState, sea, 1);
        }

        return [x, z];
    };

    /**
     * Returns the best position to build a new Civil Centre
     * Whose primary function would be to assure territorial continuity with our allies
     */
    m.HQ.prototype.findStrategicCCLocation = function (gameState, template) {
        // This builds a map. The procedure is fairly simple.
        // We minimize the Sum((dist-300)**2) where the sum is on the three nearest allied CC
        // with the constraints that all CC have dist > 200 and at least one have dist < 400
        // This needs at least 2 CC. Otherwise, go back to economic CC.

        let ccEnts = gameState.updatingGlobalCollection("allCCs", API3.Filters.byClass("CivCentre"));
        let ccList = [];
        let numAllyCC = 0;
        for (let cc of ccEnts.values()) {
            let ally = gameState.isPlayerAlly(cc.owner());
            ccList.push({ "pos": cc.position(), "ally": ally });
            if (ally)
                ++numAllyCC;
        }
        if (numAllyCC < 2)
            return this.findEconomicCCLocation(gameState, template, "wood", undefined, true);

        Engine.ProfileStart("findStrategicCCLocation");

        // obstruction map
        let obstructions = m.createObstructionMap(gameState, 0, template);
        let halfSize = 0;
        if (template.get("Footprint/Square"))
            halfSize = Math.max(+template.get("Footprint/Square/@depth"), +template.get("Footprint/Square/@width")) / 2;
        else if (template.get("Footprint/Circle"))
            halfSize = +template.get("Footprint/Circle/@radius");

        let bestIdx;
        let bestVal;
        let radius = Math.ceil(template.obstructionRadius().max / obstructions.cellSize);

        let width = this.territoryMap.width;
        let cellSize = this.territoryMap.cellSize;
        let currentVal, delta;
        let distcc0, distcc1, distcc2;
        let favoredDistance = (template.hasClass("Colony") ? 220 : 280) - 40 * this.Config.personality.defensive;

        for (let j = 0; j < this.territoryMap.length; ++j) {
            if (this.territoryMap.getOwnerIndex(j) != 0)
                continue;
            // with enough room around to build the cc
            let i = this.territoryMap.getNonObstructedTile(j, radius, obstructions);
            if (i < 0)
                continue;
            // we require that it is accessible
            let index = gameState.ai.accessibility.landPassMap[i];
            if (!this.landRegions[index])
                continue;

            // checking distances to other cc
            let pos = [cellSize * (j % width + 0.5), cellSize * (Math.floor(j / width) + 0.5)];
            let minDist = Math.min();
            distcc0 = undefined;

            for (let cc of ccList) {
                let dist = API3.SquareVectorDistance(cc.pos, pos);
                if (dist < 14000)    // Reject if too near from any cc
                {
                    minDist = 0;
                    break;
                }
                if (!cc.ally)
                    continue;
                if (dist < 62000)    // Reject if quite near from ally cc
                {
                    minDist = 0;
                    break;
                }
                if (dist < minDist)
                    minDist = dist;

                if (!distcc0 || dist < distcc0) {
                    distcc2 = distcc1;
                    distcc1 = distcc0;
                    distcc0 = dist;
                }
                else if (!distcc1 || dist < distcc1) {
                    distcc2 = distcc1;
                    distcc1 = dist;
                }
                else if (!distcc2 || dist < distcc2)
                    distcc2 = dist;
            }
            if (minDist < 1 || minDist > 170000 && !this.navalMap)
                continue;

            delta = Math.sqrt(distcc0) - favoredDistance;
            currentVal = delta * delta;
            delta = Math.sqrt(distcc1) - favoredDistance;
            currentVal += delta * delta;
            if (distcc2) {
                delta = Math.sqrt(distcc2) - favoredDistance;
                currentVal += delta * delta;
            }
            // disfavor border of the map
            if (this.borderMap.map[j] & m.fullBorder_Mask)
                currentVal += 10000;

            if (bestVal !== undefined && currentVal > bestVal)
                continue;
            if (this.isDangerousLocation(gameState, pos, halfSize))
                continue;
            bestVal = currentVal;
            bestIdx = i;
        }

        if (this.Config.debug > 1)
            API3.warn("We've found a strategic base with bestVal = " + bestVal);

        Engine.ProfileStop();

        if (bestVal === undefined)
            return undefined;

        let x = (bestIdx % obstructions.width + 0.5) * obstructions.cellSize;
        let z = (Math.floor(bestIdx / obstructions.width) + 0.5) * obstructions.cellSize;

        // Define a minimal number of wanted ships in the seas reaching this new base
        let indexIdx = gameState.ai.accessibility.landPassMap[bestIdx];
        for (let base of this.baseManagers) {
            if (!base.anchor || base.accessIndex == indexIdx)
                continue;
            let sea = this.getSeaBetweenIndices(gameState, base.accessIndex, indexIdx);
            if (sea !== undefined)
                this.navalManager.setMinimalTransportShips(gameState, sea, 1);
        }

        return [x, z];
    };

    /**
     * Returns the best position to build a new market: if the allies already have a market, build it as far as possible
     * from it, although not in our border to be able to defend it easily. If no allied market, our second market will
     * follow the same logic.
     * To do so, we suppose that the gain/distance is an increasing function of distance and look for the max distance
     * for performance reasons.
     */
    m.HQ.prototype.findMarketLocation = function (gameState, template) {
        let markets = gameState.updatingCollection("diplo-ExclusiveAllyMarkets", API3.Filters.byClass("Market"), gameState.getExclusiveAllyEntities()).toEntityArray();
        if (!markets.length)
            markets = gameState.updatingCollection("OwnMarkets", API3.Filters.byClass("Market"), gameState.getOwnStructures()).toEntityArray();

        if (!markets.length)	// this is the first market. For the time being, place it arbitrarily by the ConstructionPlan
            return [-1, -1, -1, 0];

        // obstruction map
        let obstructions = m.createObstructionMap(gameState, 0, template);
        let halfSize = 0;
        if (template.get("Footprint/Square"))
            halfSize = Math.max(+template.get("Footprint/Square/@depth"), +template.get("Footprint/Square/@width")) / 2;
        else if (template.get("Footprint/Circle"))
            halfSize = +template.get("Footprint/Circle/@radius");

        let bestIdx;
        let bestJdx;
        let bestVal;
        let bestDistSq;
        let bestGainMult;
        let radius = Math.ceil(template.obstructionRadius().max / obstructions.cellSize);
        let isNavalMarket = template.hasClass("NavalMarket");

        let width = this.territoryMap.width;
        let cellSize = this.territoryMap.cellSize;

        let traderTemplatesGains = gameState.getTraderTemplatesGains();

        for (let j = 0; j < this.territoryMap.length; ++j) {
            // do not try on the narrow border of our territory
            if (this.borderMap.map[j] & m.narrowFrontier_Mask)
                continue;
            if (this.basesMap.map[j] == 0)   // only in our territory
                continue;
            // with enough room around to build the market
            let i = this.territoryMap.getNonObstructedTile(j, radius, obstructions);
            if (i < 0)
                continue;
            let index = gameState.ai.accessibility.landPassMap[i];
            if (!this.landRegions[index])
                continue;
            let pos = [cellSize * (j % width + 0.5), cellSize * (Math.floor(j / width) + 0.5)];
            // checking distances to other markets
            let maxVal = 0;
            let maxDistSq;
            let maxGainMult;
            let gainMultiplier;
            for (let market of markets) {
                if (isNavalMarket && market.hasClass("NavalMarket")) {
                    if (m.getSeaAccess(gameState, market) != gameState.ai.accessibility.getAccessValue(pos, true))
                        continue;
                    gainMultiplier = traderTemplatesGains.navalGainMultiplier;
                }
                else if (m.getLandAccess(gameState, market) == index &&
                    !m.isLineInsideEnemyTerritory(gameState, market.position(), pos))
                    gainMultiplier = traderTemplatesGains.landGainMultiplier;
                else
                    continue;
                if (!gainMultiplier)
                    continue;
                let distSq = API3.SquareVectorDistance(market.position(), pos);
                if (gainMultiplier * distSq > maxVal) {
                    maxVal = gainMultiplier * distSq;
                    maxDistSq = distSq;
                    maxGainMult = gainMultiplier;
                }
            }
            if (maxVal == 0)
                continue;
            if (bestVal !== undefined && maxVal < bestVal)
                continue;
            if (this.isDangerousLocation(gameState, pos, halfSize))
                continue;
            bestVal = maxVal;
            bestDistSq = maxDistSq;
            bestGainMult = maxGainMult;
            bestIdx = i;
            bestJdx = j;
        }

        if (this.Config.debug > 1)
            API3.warn("We found a market position with bestVal = " + bestVal);

        if (bestVal === undefined)  // no constraints. For the time being, place it arbitrarily by the ConstructionPlan
        {
            return [-1, -1, -1, 0];
        }
        let expectedGain = Math.round(bestGainMult * TradeGain(bestDistSq, gameState.sharedScript.mapSize));
        if (this.Config.debug > 1)
            API3.warn("this would give a trading gain of " + expectedGain);
        // do not keep it if gain is too small, except if this is our first BarterMarket
        let idx;
        if (expectedGain < this.tradeManager.minimalGain) {
            if (template.hasClass("BarterMarket") &&
                !gameState.getOwnEntitiesByClass("BarterMarket", true).hasEntities())
                idx = -1;	// needed by queueplanBuilding manager to keep that market
            else
                return false;
        }
        else
            idx = this.basesMap.map[bestJdx];

        let x = (bestIdx % obstructions.width + 0.5) * obstructions.cellSize;
        let z = (Math.floor(bestIdx / obstructions.width) + 0.5) * obstructions.cellSize;
        let toReturnPos = [x, z, idx, expectedGain];

        for (let market of markets) {
            let distance = API3.SquareVectorDistance(toReturnPos, market.position());
            if (distance < this.Config.Military.MarketMinRange * this.Config.Military.MarketMinRange)
                return false;
        }
        return toReturnPos;
    };

    /**
     * Returns the best position to build defensive buildings (fortress and towers)
     * Whose primary function is to defend our borders
     */
    m.HQ.prototype.findDefensiveLocation = function (gameState, template) {
        // We take the point in our territory which is the nearest to any enemy cc
        // but requiring a minimal distance with our other defensive structures
        // and not in range of any enemy defensive structure to avoid building under fire.

        let ownStructures = gameState.getOwnStructures().filter(API3.Filters.byClassesOr(["Fortress", "Tower"])).toEntityArray();
        let enemyStructures = gameState.getEnemyStructures().filter(API3.Filters.not(API3.Filters.byOwner(0))).
            filter(API3.Filters.byClassesOr(["CivCentre", "Fortress", "Tower"]));
        if (!enemyStructures.hasEntities())	// we may be in cease fire mode, build defense against neutrals
        {
            enemyStructures = gameState.getNeutralStructures().filter(API3.Filters.not(API3.Filters.byOwner(0))).
                filter(API3.Filters.byClassesOr(["CivCentre", "Fortress", "Tower"]));
            if (!enemyStructures.hasEntities() && !gameState.getAlliedVictory())
                enemyStructures = gameState.getAllyStructures().filter(API3.Filters.not(API3.Filters.byOwner(PlayerID))).
                    filter(API3.Filters.byClassesOr(["CivCentre", "Fortress", "Tower"]));
            if (!enemyStructures.hasEntities())
                return undefined;
        }
        enemyStructures = enemyStructures.toEntityArray();

        let wonderMode = gameState.getVictoryConditions().has("wonder");
        let wonderDistmin;
        let wonders;
        if (wonderMode) {
            wonders = gameState.getOwnStructures().filter(API3.Filters.byClass("Wonder")).toEntityArray();
            wonderMode = wonders.length != 0;
            if (wonderMode)
                wonderDistmin = (50 + wonders[0].footprintRadius()) * (50 + wonders[0].footprintRadius());
        }

        // obstruction map
        let obstructions = m.createObstructionMap(gameState, 0, template);
        let halfSize = 0;
        if (template.get("Footprint/Square"))
            halfSize = Math.max(+template.get("Footprint/Square/@depth"), +template.get("Footprint/Square/@width")) / 2;
        else if (template.get("Footprint/Circle"))
            halfSize = +template.get("Footprint/Circle/@radius");

        let bestIdx;
        let bestJdx;
        let bestVal;
        let width = this.territoryMap.width;
        let cellSize = this.territoryMap.cellSize;

        let isTower = template.hasClass("Tower");
        let isFortress = template.hasClass("Fortress");
        let radius;
        if (isFortress)
            radius = Math.floor((template.obstructionRadius().max + 8) / obstructions.cellSize);
        else
            radius = Math.ceil(template.obstructionRadius().max / obstructions.cellSize);

        for (let j = 0; j < this.territoryMap.length; ++j) {
            if (!wonderMode) {
                // do not try if well inside or outside territory
                if (!(this.borderMap.map[j] & m.fullFrontier_Mask))
                    continue;
                if (this.borderMap.map[j] & m.largeFrontier_Mask && isTower)
                    continue;
            }
            if (this.basesMap.map[j] == 0)   // inaccessible cell
                continue;
            // with enough room around to build the cc
            let i = this.territoryMap.getNonObstructedTile(j, radius, obstructions);
            if (i < 0)
                continue;

            let pos = [cellSize * (j % width + 0.5), cellSize * (Math.floor(j / width) + 0.5)];
            // checking distances to other structures
            let minDist = Math.min();

            let dista = 0;
            if (wonderMode) {
                dista = API3.SquareVectorDistance(wonders[0].position(), pos);
                if (dista < wonderDistmin)
                    continue;
                dista *= 200;   // empirical factor (TODO should depend on map size) to stay near the wonder
            }

            for (let str of enemyStructures) {
                if (str.foundationProgress() !== undefined)
                    continue;
                let strPos = str.position();
                if (!strPos)
                    continue;
                let dist = API3.SquareVectorDistance(strPos, pos);
                if (dist < 6400) //  TODO check on true attack range instead of this 80*80
                {
                    minDist = -1;
                    break;
                }
                if (str.hasClass("CivCentre") && dist + dista < minDist)
                    minDist = dist + dista;
            }
            if (minDist < 0)
                continue;

            let cutDist = 900;  //  30*30   TODO maybe increase it
            for (let str of ownStructures) {
                let strPos = str.position();
                if (!strPos)
                    continue;
                if (API3.SquareVectorDistance(strPos, pos) < cutDist) {
                    minDist = -1;
                    break;
                }
            }
            if (minDist < 0 || minDist == Math.min())
                continue;
            if (bestVal !== undefined && minDist > bestVal)
                continue;
            if (this.isDangerousLocation(gameState, pos, halfSize))
                continue;
            bestVal = minDist;
            bestIdx = i;
            bestJdx = j;
        }

        if (bestVal === undefined)
            return undefined;

        let x = (bestIdx % obstructions.width + 0.5) * obstructions.cellSize;
        let z = (Math.floor(bestIdx / obstructions.width) + 0.5) * obstructions.cellSize;
        return [x, z, this.basesMap.map[bestJdx]];
    };

    m.HQ.prototype.buildTemple = function (gameState, queues) {
        // at least one market (which have the same queue) should be build before any temple
        if (queues.economicBuilding.hasQueuedUnits() ||
            gameState.getOwnEntitiesByClass("Temple", true).hasEntities() ||
            !gameState.getOwnEntitiesByClass("BarterMarket", true).hasEntities())
            return;
        // Try to build a temple earlier if in regicide to recruit healer guards
        if (this.currentPhase < 3 && !gameState.getVictoryConditions().has("regicide"))
            return;

        let templateName = "structures/{civ}_temple";
        if (this.canBuild(gameState, "structures/{civ}_temple_vesta"))
            templateName = "structures/{civ}_temple_vesta";
        else if (!this.canBuild(gameState, templateName))
            return;
        queues.economicBuilding.addPlan(new m.ConstructionPlan(gameState, templateName));
    };

    m.HQ.prototype.buildMarket = function (gameState, queues) {
        if (!this.canBuild(gameState, "structures/{civ}/{civ}_market"))
            return;

        if (queues.economicBuilding.hasQueuedUnitsWithClass("BarterMarket"))
            return;

        gameState.ai.queueManager.changePriority("economicBuilding", 3 * this.Config.priorities.economicBuilding);
        let plan = new m.ConstructionPlan(gameState, "structures/{civ}/{civ}_market");
        plan.queueToReset = "economicBuilding";
        queues.economicBuilding.addPlan(plan);
    };

    /** Build a farmstead */
    m.HQ.prototype.buildFarmstead = function (gameState, queues) {
        // Only build one farmstead for the time being ("DropsiteFood" does not refer to CCs)
        if (gameState.getOwnEntitiesByClass("Farmstead", true).hasEntities())
            return;
        // Wait to have at least one dropsite and house before the farmstead
        if (!gameState.getOwnEntitiesByClass("Storehouse", true).hasEntities())
            return;
        if (!gameState.getOwnEntitiesByClass("House", true).hasEntities())
            return;
        if (queues.economicBuilding.hasQueuedUnitsWithClass("DropsiteFood"))
            return;
        if (!this.canBuild(gameState, "structures/{civ}_farmstead"))
            return;

        queues.economicBuilding.addPlan(new m.ConstructionPlan(gameState, "structures/{civ}_farmstead"));
    };

    /**
     * Try to build a wonder when required
     * force = true when called from the victoryManager in case of Wonder victory condition.
     */
    m.HQ.prototype.buildWonder = function (gameState, queues, force = false) {
        if (queues.wonder && queues.wonder.hasQueuedUnits() ||
            gameState.getOwnEntitiesByClass("Wonder", true).hasEntities() ||
            !this.canBuild(gameState, "structures/{civ}_wonder"))
            return;

        if (!force) {
            let template = gameState.getTemplate(gameState.applyCiv("structures/{civ}_wonder"));
            // Check that we have enough resources to start thinking to build a wonder
            let cost = template.cost();
            let resources = gameState.getResources();
            let highLevel = 0;
            let lowLevel = 0;
            for (let res in cost) {
                if (resources[res] && resources[res] > 0.7 * cost[res])
                    ++highLevel;
                else if (!resources[res] || resources[res] < 0.3 * cost[res])
                    ++lowLevel;
            }
            if (highLevel == 0 || lowLevel > 1)
                return;
        }

        queues.wonder.addPlan(new m.ConstructionPlan(gameState, "structures/{civ}_wonder"));
    };

    /** Build a corral, and train animals there */
    m.HQ.prototype.manageCorral = function (gameState, queues) {
        if (queues.corral.hasQueuedUnits())
            return;

        let nCorral = gameState.getOwnEntitiesByClass("Corral", true).length;
        if (!nCorral || !gameState.isTemplateAvailable(gameState.applyCiv("structures/{civ}_field")) &&
            nCorral < this.currentPhase && gameState.getPopulation() > 30 * nCorral) {
            if (this.canBuild(gameState, "structures/{civ}_corral")) {
                queues.corral.addPlan(new m.ConstructionPlan(gameState, "structures/{civ}_corral"));
                return;
            }
            if (!nCorral)
                return;
        }

        // And train some animals
        let civ = gameState.getPlayerCiv();
        for (let corral of gameState.getOwnEntitiesByClass("Corral", true).values()) {
            if (corral.foundationProgress() !== undefined)
                continue;
            let trainables = corral.trainableEntities(civ);
            for (let trainable of trainables) {
                if (gameState.isTemplateDisabled(trainable))
                    continue;
                let template = gameState.getTemplate(trainable);
                if (!template || !template.isHuntable())
                    continue;
                let count = gameState.countEntitiesByType(trainable, true);
                for (let item of corral.trainingQueue())
                    count += item.count;
                if (count > nCorral)
                    continue;
                queues.corral.addPlan(new m.TrainingPlan(gameState, trainable, { "trainer": corral.id() }));
                return;
            }
        }
    };

    /**
     * build more houses if needed.
     * kinda ugly, lots of special cases to both build enough houses but not tooo many…
     */
    m.HQ.prototype.buildMoreHouses = function (gameState, queues) {
        if (!gameState.isTemplateAvailable(gameState.applyCiv("structures/{civ}_house")) ||
            gameState.getPopulationMax() <= gameState.getPopulationLimit())
            return;

        let numPlanned = queues.house.length();
        if (numPlanned < 3 || numPlanned < 5 && gameState.getPopulation() > 80) {
            let plan = new m.ConstructionPlan(gameState, "structures/{civ}_house");
            // change the starting condition according to the situation.
            plan.goRequirement = "houseNeeded";
            queues.house.addPlan(plan);
        }

        if (numPlanned > 0 && this.phasing && gameState.getPhaseEntityRequirements(this.phasing).length) {
            let houseTemplateName = gameState.applyCiv("structures/{civ}_house");
            let houseTemplate = gameState.getTemplate(houseTemplateName);

            let needed = 0;
            for (let entityReq of gameState.getPhaseEntityRequirements(this.phasing)) {
                if (!houseTemplate.hasClass(entityReq.class))
                    continue;

                let count = gameState.getOwnStructures().filter(API3.Filters.byClass(entityReq.class)).length;
                if (count < entityReq.count && this.buildManager.isUnbuildable(gameState, houseTemplateName)) {
                    if (this.Config.debug > 1)
                        API3.warn("no room to place a house ... try to be less restrictive");
                    this.buildManager.setBuildable(houseTemplateName);
                    this.requireHouses = true;
                }
                needed = Math.max(needed, entityReq.count - count);
            }

            let houseQueue = queues.house.plans;
            for (let i = 0; i < numPlanned; ++i)
                if (houseQueue[i].isGo(gameState))
                    --needed;
                else if (needed > 0) {
                    houseQueue[i].goRequirement = undefined;
                    --needed;
                }
        }

        if (this.requireHouses) {
            let houseTemplate = gameState.getTemplate(gameState.applyCiv("structures/{civ}_house"));
            if (!this.phasing || gameState.getPhaseEntityRequirements(this.phasing).every(req =>
                !houseTemplate.hasClass(req.class) || gameState.getOwnStructures().filter(API3.Filters.byClass(req.class)).length >= req.count))
                this.requireHouses = undefined;
        }

        // When population limit too tight
        //    - if no room to build, try to improve with technology
        //    - otherwise increase temporarily the priority of houses
        let house = gameState.applyCiv("structures/{civ}_house");
        let HouseNb = gameState.getOwnFoundations().filter(API3.Filters.byClass("House")).length;
        let popBonus = gameState.getTemplate(house).getPopulationBonus();
        let freeSlots = gameState.getPopulationLimit() + HouseNb * popBonus - this.getAccountedPopulation(gameState);
        let priority;
        if (freeSlots < 5) {
            if (this.buildManager.isUnbuildable(gameState, house)) {
                if (this.Config.debug > 1)
                    API3.warn("no room to place a house ... try to improve with technology");
                //this.researchManager.researchPopulationBonus(gameState, queues);
            }
            else
                priority = 2 * this.Config.priorities.house;
        }
        else
            priority = this.Config.priorities.house;

        if (priority && priority != gameState.ai.queueManager.getPriority("house"))
            gameState.ai.queueManager.changePriority("house", priority);
    };

    /** Checks the status of the territory expansion. If no new economic bases created, build some strategic ones. */
    m.HQ.prototype.checkBaseExpansion = function (gameState, queues) {
        if (queues.civilCentre.hasQueuedUnits())
            return;
        // First build one cc if all have been destroyed
        if (this.numPotentialBases() == 0) {
            this.buildFirstBase(gameState);
            return;
        }
        // Then expand if we have not enough room available for buildings
        if (this.buildManager.numberMissingRoom(gameState) > 1) {
            if (this.Config.debug > 2)
                API3.warn("try to build a new base because not enough room to build ");
            this.buildNewBase(gameState, queues);
            return;
        }
        // If we've already planned to phase up, wait a bit before trying to expand
        if (this.phasing)
            return;
        // Finally expand if we have lots of units (threshold depending on the aggressivity value)
        let activeBases = this.numActiveBases();
        let numUnits = gameState.getOwnUnits().length;
        let numvar = 10 * (1 - this.Config.personality.aggressive);
        if (numUnits > activeBases * (65 + numvar + (10 + numvar) * (activeBases - 1)) || this.saveResources && numUnits > 50) {
            if (this.Config.debug > 2)
                API3.warn("try to build a new base because of population " + numUnits + " for " + activeBases + " CCs");
            this.buildNewBase(gameState, queues);
        }
    };

    m.HQ.prototype.buildNewBase = function (gameState, queues, resource) {
        if (this.numPotentialBases() > 0 && this.currentPhase == 1 && !gameState.isResearching(gameState.getPhaseName(2)))
            return false;
        if (gameState.getOwnFoundations().filter(API3.Filters.byClass("CivCentre")).hasEntities() || queues.militaryBuilding.hasQueuedUnits())
            return false;

        let remainingResources = this.getTotalResourceLevel(gameState);
        let availableResources = gameState.ai.queueManager.getAvailableResources(gameState);
        let totalResources = 0;
        for (let type in remainingResources) {
            totalResources += availableResources[type];
        }

        if (gameState.getPopulation() < gameState.getPopulationMax())
        {
            if (gameState.getPopulation() < this.Config.Military.PopPerExpansion * this.numActiveBases())
                return;
        }

        if (this.numActiveBases() > 2) {
            if (totalResources < 4000)
                return;
        }

        let template;
        // We require at least one of this civ civCentre as they may allow specific units or techs
        let hasOwnCC = false;
        for (let ent of gameState.updatingGlobalCollection("allCCs", API3.Filters.byClass("CivCentre")).values()) {
            if (ent.owner() != PlayerID || ent.templateName() != gameState.applyCiv("structures/{civ}_civil_centre"))
                continue;
            hasOwnCC = true;
            break;
        }
        if (hasOwnCC && this.canBuild(gameState, "structures/{civ}_civil_centreB"))
            template = "structures/{civ}_civil_centreB";
        else if (this.canBuild(gameState, "structures/{civ}_civil_centre"))
            template = "structures/{civ}_civil_centre";
        else if (!hasOwnCC && this.canBuild(gameState, "structures/{civ}_civil_centreB"))
            template = "structures/{civ}_civil_centreB";
        else
            return false;

        // base "-1" means new base.
        if (this.Config.debug > 1)
            API3.warn("new base " + gameState.applyCiv(template) + " planned with resource " + resource);
        queues.militaryBuilding.addPlan(new m.ConstructionPlan(gameState, template, { "base": -1, "resource": resource }));
        return true;
    };

    /** Deals with building fortresses and towers along our border with enemies. */
    m.HQ.prototype.buildDefenses = function (gameState, queues) {
        if (this.saveResources && !this.canBarter || queues.defenseBuilding.hasQueuedUnits())
            return;

        if (!this.saveResources && (this.currentPhase > 2 || gameState.isResearching(gameState.getPhaseName(3)))) {
            // try to build fortresses
            if (this.canBuild(gameState, "structures/{civ}_fortress")) {
                let numFortresses = gameState.getOwnEntitiesByClass("Fortress", true).length;
                if ((!numFortresses || gameState.ai.elapsedTime > (1 + 0.10 * numFortresses) * this.fortressLapseTime + this.fortressStartTime) &&
                    numFortresses < this.numActiveBases() + 1 + this.extraFortresses &&
                    numFortresses < Math.floor(gameState.getPopulation() / 25) &&
                    gameState.getOwnFoundationsByClass("Fortress").length < 2) {
                    this.fortressStartTime = gameState.ai.elapsedTime;
                    if (!numFortresses)
                        gameState.ai.queueManager.changePriority("defenseBuilding", 2 * this.Config.priorities.defenseBuilding);
                    let plan = new m.ConstructionPlan(gameState, "structures/{civ}_fortress");
                    plan.queueToReset = "defenseBuilding";
                    queues.defenseBuilding.addPlan(plan);
                    return;
                }
            }
        }

        if (this.Config.Military.numSentryTowers && this.currentPhase < 2 && this.canBuild(gameState, "structures/{civ}_sentry_tower")) {
            let numTowers = gameState.getOwnEntitiesByClass("Tower", true).length;	// we count all towers, including wall towers
            let towerLapseTime = this.saveResource ? (1 + 0.5 * numTowers) * this.towerLapseTime : this.towerLapseTime;
            if (numTowers < this.Config.Military.numSentryTowers && gameState.ai.elapsedTime > towerLapseTime + this.fortStartTime) {
                this.fortStartTime = gameState.ai.elapsedTime;
                queues.defenseBuilding.addPlan(new m.ConstructionPlan(gameState, "structures/{civ}_sentry_tower"));
            }
            return;
        }

        if (this.currentPhase < 2 || !this.canBuild(gameState, "structures/{civ}_defense_tower"))
            return;

        let numTowers = gameState.getOwnEntitiesByClass("StoneTower", true).length;
        let towerLapseTime = this.saveResource ? (1 + numTowers) * this.towerLapseTime : this.towerLapseTime;
        if ((!numTowers || gameState.ai.elapsedTime > (1 + 0.1 * numTowers) * towerLapseTime + this.towerStartTime) &&
            numTowers < 2 * this.numActiveBases() + 3 + this.extraTowers &&
            numTowers < Math.floor(gameState.getPopulation() / 8) &&
            gameState.getOwnFoundationsByClass("DefenseTower").length < 3) {
            this.towerStartTime = gameState.ai.elapsedTime;
            if (numTowers > 2 * this.numActiveBases() + 3)
                gameState.ai.queueManager.changePriority("defenseBuilding", Math.round(0.7 * this.Config.priorities.defenseBuilding));
            let plan = new m.ConstructionPlan(gameState, "structures/{civ}_defense_tower");
            plan.queueToReset = "defenseBuilding";
            queues.defenseBuilding.addPlan(plan);
        }
    };

    m.HQ.prototype.buildBlacksmith = function (gameState, queues) {
        if (this.getAccountedPopulation(gameState) < this.Config.Military.popForBlacksmith ||
            queues.militaryBuilding.hasQueuedUnits() || gameState.getOwnEntitiesByClass("Blacksmith", true).length)
            return;
        // build a market before the blacksmith
        if (!gameState.getOwnEntitiesByClass("BarterMarket", true).hasEntities())
            return;

        if (this.canBuild(gameState, "structures/{civ}_blacksmith"))
            queues.militaryBuilding.addPlan(new m.ConstructionPlan(gameState, "structures/{civ}_blacksmith"));
    };  

    m.HQ.prototype.UpgradeBuildings = function (gameState, Buildings, activeBases)
    {
        // dont upgrade if this faction has no upgradeable buildings
        if (this.bUpgrades.length < 1)
            return;

        // get a building that has possible upgrades
        for (let building of Buildings.values()) {
            if (building.getUpgradeBuilding()) {
                if (randFloat(0, 1) < 0.5) {
                    this.randomUpgradeBuilding = building;
                    break;
                }
            }
        }      

        if (this.randomUpgradeBuilding == 0)
            return;       

        // get all the possible upgrades from this building
        let upgradeToTemplates = this.randomUpgradeBuilding.getUpgradeBuildings();
        let randomValue = -1;

        // check if there is necessary upgrade that has prio over others
        for (let i = 0; i < upgradeToTemplates.length; i++) {
            let template = gameState.getTemplate(upgradeToTemplates[i]);
            if (template.hasClass("PrioBuilding")) {
                randomValue = i;
                break;
            }
        }

        // if there is no necessary upgrade just pick a random one
        if (randomValue === -1)
            randomValue = Math.floor(randFloat(0, upgradeToTemplates.length));

        let upgradeToTemplate = gameState.getTemplate(upgradeToTemplates[randomValue]);
        let succesiveList = [];
        let randomBuildingAmount = 0;

        // get the amount of succesive upgrades this building has
        while (true) {
            if (upgradeToTemplate.getUpgradeBuilding()) {
                succesiveList.push(upgradeToTemplate);
                upgradeToTemplate = gameState.getTemplate(upgradeToTemplate.getUpgradeBuilding());
            }
            else {
                succesiveList.push(upgradeToTemplate);
                break;
            }
        }

        // check how many of the selected building has already been build by the AI making sure to only add +1 for every building once
        for (let building of Buildings.values()) {
            if (succesiveList.length !== 0) {
                for (let succesiveTemplate of succesiveList) {
                    if (building.specificName() === succesiveTemplate.specificName()) {
                        randomBuildingAmount += 1;
                        break;
                    }
                }
            }
        }

        if (upgradeToTemplate.AIMaxCopies()) {
            if (randomBuildingAmount >= upgradeToTemplate.AIMaxCopies()) {
                return;
            }
        }

        if (upgradeToTemplate.AIMaxCopiesPerBase()) {
            if (randomBuildingAmount >= (upgradeToTemplate.AIMaxCopiesPerBase() * activeBases)) {
                return;
            }
        }

        let minPop = 0;
        if (upgradeToTemplate.AIMinPop())
            minPop = upgradeToTemplate.AIMinPop();

        let minPopPerCopy = 0;
        if (upgradeToTemplate.AIMinPopPerCopy())
            minPopPerCopy = upgradeToTemplate.AIMinPopPerCopy();

        // check pop, then upgrade the building
        if (gameState.getPopulation() > minPop && gameState.getPopulation() > (minPopPerCopy * activeBases)) {
            this.randomUpgradeBuilding.upgradeBuilding(upgradeToTemplates[randomValue]);
        }
    }

    m.HQ.prototype.UpgradeUnits = function (gameState, queues)
    {
        if (queues.militaryBuilding.hasQueuedUnits() || queues.majorTech.hasQueuedUnits())
            return;

        if (this.bUpgrades.length > 1)
        {
            let randomUnits = [];
            let totalWorkers = 0;
            let citizenSoldiers = 0;
            let builders = 0;

            // get a unit that has possible upgrades
            for (let unit of gameState.getOwnEntities().values())
            {
                if (unit.hasClass("FemaleCitizen")) {
                    totalWorkers += 1;
                    if (unit.getMetadata(PlayerID, "role") === "undefined")
                        unit.setMetadata(PlayerID, "role", "worker");
                }

                if (unit.hasClass("Builder")){
                    builders += 1;
                }

                if (unit.hasClass("BasicSoldier")) {
                    citizenSoldiers += 1;
                    if (unit.getMetadata(PlayerID, "role") === "undefined")
                        unit.setMetadata(PlayerID, "role", "worker");
                }

                if (unit.getUpgradeBuilding() && unit.hasClass("Upgradeable"))
                {
                    randomUnits.push(unit);
                }
            }

            if (randomUnits.length < 1)
                return;

            let requiredWorkers = Math.round(gameState.getPopulationLimit() * this.Config.Military.CitizenPercentage);
            let requiredBasicSoldiers = Math.round(gameState.getPopulationLimit() * this.Config.Military.BasicSoldierPercentage);
            let requiredBuilders = this.Config.Military.MaxBuilders;
            let randomValue = -1;
            let recruitConditional = false;

            if (totalWorkers < requiredWorkers || builders < requiredBuilders || citizenSoldiers < requiredBasicSoldiers)
            {
                recruitConditional = true;
            }

            for (let i = 0; i < randomUnits.length; i++) {
                let upgradeToTemplates = randomUnits[i].getUpgradeBuildings();
                let potentialValues = [];
                let hasConditional = false; 

                if(recruitConditional === true)
                {   
                    for (let j = 0; j < upgradeToTemplates.length; j++)
                    {
                        let template = gameState.getTemplate(upgradeToTemplates[j]);                   
                
                        if (template.hasClass("FemaleCitizen") && totalWorkers < requiredWorkers 
                            || template.hasClass("Builder") && builders < requiredBuilders 
                            || template.hasClass("BasicSoldier") && citizenSoldiers < requiredBasicSoldiers) 
                        {
                            potentialValues.push(j);
                            hasConditional = true;
                        }
                    }
                }
               
                if(hasConditional === false)
                {
                    for (let j = 0; j < upgradeToTemplates.length; j++)
                    {
                        let template = gameState.getTemplate(upgradeToTemplates[j]);                   
                
                        if (!template.hasClass("FemaleCitizen") && !template.hasClass("Builder") && !template.hasClass("BasicSoldier")) {
                            potentialValues.push(j);
                        }
                    }
                }

    
                if (potentialValues.length < 1)
                    continue;
                else
                    randomValue = pickRandom(potentialValues);

                let upgradeToTemplate = gameState.getTemplate(upgradeToTemplates[randomValue]);
                let minPop = 0;

                if (!upgradeToTemplate)
                    continue;

                if (upgradeToTemplate.AIMinPop())
                    minPop = upgradeToTemplate.AIMinPop();

                let reachedMax = false;
                if (upgradeToTemplate.AIMaxCopies()) {
                    let maxcopies = upgradeToTemplate.AIMaxCopies();
                    let amount = 0;

                    gameState.getOwnUnits().forEach(function (ent) 
                    {
                        if (upgradeToTemplate.specificName() === ent.specificName()) 
                        {
                            amount += 1;
                            if (amount >= maxcopies){
                                reachedMax = true;
                                return;
                            }
                        }
                    });
                }

                if(reachedMax === true)
                    continue;

                // check pop, then upgrade the unit
                if (gameState.getPopulation() > minPop) {                   
                    randomUnits[i].upgradeBuilding(upgradeToTemplates[randomValue]);
                }
            }
        }
    }

    m.HQ.prototype.SummonerPlan = function (gameState, queues) {

        let specialBuilder = 0;
        gameState.getOwnUnits().forEach(function (ent) {
            if (ent.hasClass("Summoner")) {                
                specialBuilder = ent;
                return;
            }
        });
        if (specialBuilder === 0)
            return;

        if (queues.militaryBuilding.hasQueuedUnitsWithClass("SummonerEntity"))
            return;

        let maxNumber = this.Config.Military.maxSummonerEntities;
        let buildable = specialBuilder.buildableEntities();  
        let buildingCount = 0;
        gameState.getOwnEntities().forEach(function (ent) {
            if (ent.hasClass("SummonerEntity") && ent.foundationProgress() !== undefined) {           
                buildingCount += 1;

                if (buildingCount >= maxNumber)
                    return;
            }
        });

        if (buildingCount >= maxNumber)
            return;

        let plan = new m.ConstructionPlan(gameState, buildable[0]);
        queues.militaryBuilding.addPlan(plan);
    }

    m.HQ.prototype.SummonerBuild = function (gameState, foundations) {
        if (foundations.length < 1)
            return;

        let currentFoundation = 0
        for (let foundation of foundations.values()) {
            if (foundation.hasClass("SummonerEntity")){
                currentFoundation = foundation;                
                break;
            }
        }

        if (currentFoundation === 0)
            return;

        let specialBuilders = [];
        gameState.getOwnUnits().forEach(function (ent) {
            if (ent.hasClass("Summoner")) {
                specialBuilders.push(ent);
            }
        });

        if (specialBuilders.length === 0)
            return;       
        
        for (let specialBuilder of specialBuilders) {    
            if (specialBuilder.unitAIState() === "INDIVIDUAL.REPAIR.APPROACHING" || specialBuilder.unitAIState() === "INDIVIDUAL.REPAIR.REPAIRING")
                continue;

            specialBuilder.setMetadata(PlayerID, "role", "worker");
            specialBuilder.setMetadata(PlayerID, "subrole", "builder");
            specialBuilder.repair(currentFoundation, true);
        }
    }

    m.HQ.prototype.BuildOrder = function (gameState, foundations) {
        if (foundations.length < 1)
            return;

        let foundationList = []
        for (let foundation of foundations.values()) {
            foundationList.push(foundation);    
            if(foundationList.length >= this.Config.Military.MaxBuilders)
                break;
        }

        if (foundationList.length < 1)
            return;

        let Builders = [];
        gameState.getOwnUnits().forEach(function (ent) {
            if (ent.hasClass("Builder")) {
                Builders.push(ent);
            }
        });

        if (Builders.length === 0)
            return;       
        
        for (let builder of Builders) {
            if(builder.unitAIState() === "INDIVIDUAL.REPAIR.APPROACHING" || builder.unitAIState() === "INDIVIDUAL.REPAIR.REPAIRING")
                continue;

            let rand = Math.floor(randFloat(0, foundationList.length));
            builder.setMetadata(PlayerID, "role", "worker");
            builder.setMetadata(PlayerID, "subrole", "builder");
            builder.repair(foundationList[rand], true);
        }
    }

    /**
     *  Find base nearest to ennemies for military buildings.
     */
    m.HQ.prototype.findBestBaseForMilitary = function (gameState) {
        let ccEnts = gameState.updatingGlobalCollection("allCCs", API3.Filters.byClass("CivCentre")).toEntityArray();
        let bestBase;
        let enemyFound = false;
        let distMin = Math.min();
        for (let cce of ccEnts) {
            if (gameState.isPlayerAlly(cce.owner()))
                continue;
            if (enemyFound && !gameState.isPlayerEnemy(cce.owner()))
                continue;
            let access = m.getLandAccess(gameState, cce);
            let isEnemy = gameState.isPlayerEnemy(cce.owner());
            for (let cc of ccEnts) {
                if (cc.owner() != PlayerID)
                    continue;
                if (m.getLandAccess(gameState, cc) != access)
                    continue;
                let dist = API3.SquareVectorDistance(cc.position(), cce.position());
                if (!enemyFound && isEnemy)
                    enemyFound = true;
                else if (dist > distMin)
                    continue;
                bestBase = cc.getMetadata(PlayerID, "base");
                distMin = dist;
            }
        }
        return bestBase;
    };

    /**
     * train with highest priority ranged infantry in the nearest civil centre from a given set of positions
     * and garrison them there for defense
     */
    m.HQ.prototype.trainEmergencyUnits = function (gameState, positions) {
        return false;

        if (gameState.ai.queues.emergency.hasQueuedUnits())
            return false;

        let civ = gameState.getPlayerCiv();
        // find nearest base anchor
        let distcut = 20000;
        let nearestAnchor;
        let distmin;
        for (let pos of positions) {
            let access = gameState.ai.accessibility.getAccessValue(pos);
            // check nearest base anchor
            for (let base of this.baseManagers) {
                if (!base.anchor || !base.anchor.position())
                    continue;
                if (m.getLandAccess(gameState, base.anchor) != access)
                    continue;
                if (!base.anchor.trainableEntities(civ))	// base still in construction
                    continue;
                let queue = base.anchor._entity.trainingQueue;
                if (queue) {
                    let time = 0;
                    for (let item of queue)
                        if (item.progress > 0 || item.metadata && item.metadata.garrisonType)
                            time += item.timeRemaining;
                    if (time / 1000 > 5)
                        continue;
                }
                let dist = API3.SquareVectorDistance(base.anchor.position(), pos);
                if (nearestAnchor && dist > distmin)
                    continue;
                distmin = dist;
                nearestAnchor = base.anchor;
            }
        }
        if (!nearestAnchor || distmin > distcut)
            return false;

        // We will choose randomly ranged and melee units, except when garrisonHolder is full
        // in which case we prefer melee units
        let numGarrisoned = this.garrisonManager.numberOfGarrisonedUnits(nearestAnchor);
        if (nearestAnchor._entity.trainingQueue) {
            for (let item of nearestAnchor._entity.trainingQueue) {
                if (item.metadata && item.metadata.garrisonType)
                    numGarrisoned += item.count;
                else if (!item.progress && (!item.metadata || !item.metadata.trainer))
                    nearestAnchor.stopProduction(item.id);
            }
        }
        let autogarrison = numGarrisoned < nearestAnchor.garrisonMax() &&
            nearestAnchor.hitpoints() > nearestAnchor.garrisonEjectHealth() * nearestAnchor.maxHitpoints();
        let rangedWanted = randBool() && autogarrison;

        let total = gameState.getResources();
        let templateFound;
        let trainables = nearestAnchor.trainableEntities(civ);
        let garrisonArrowClasses = nearestAnchor.getGarrisonArrowClasses();
        for (let trainable of trainables) {
            if (gameState.isTemplateDisabled(trainable))
                continue;
            let template = gameState.getTemplate(trainable);
            if (!template || !template.hasClass("Infantry") || !template.hasClass("CitizenSoldier"))
                continue;
            if (autogarrison && !MatchesClassList(template.classes(), garrisonArrowClasses))
                continue;
            if (!total.canAfford(new API3.Resources(template.cost())))
                continue;
            templateFound = [trainable, template];
            if (template.hasClass("Ranged") == rangedWanted)
                break;
        }
        if (!templateFound)
            return false;

        // Check first if we can afford it without touching the other accounts
        // and if not, take some of other accounted resources
        // TODO sort the queues to be substracted
        let queueManager = gameState.ai.queueManager;
        let cost = new API3.Resources(templateFound[1].cost());
        queueManager.setAccounts(gameState, cost, "emergency");
        if (!queueManager.canAfford("emergency", cost)) {
            for (let q in queueManager.queues) {
                if (q == "emergency")
                    continue;
                queueManager.transferAccounts(cost, q, "emergency");
                if (queueManager.canAfford("emergency", cost))
                    break;
            }
        }
        let metadata = { "role": "worker", "base": nearestAnchor.getMetadata(PlayerID, "base"), "plan": -1, "trainer": nearestAnchor.id() };
        if (autogarrison)
            metadata.garrisonType = "protection";
        gameState.ai.queues.emergency.addPlan(new m.TrainingPlan(gameState, templateFound[0], metadata, 1, 1));
        return true;
    };

    m.HQ.prototype.canBuild = function (gameState, structure) {
        let type = gameState.applyCiv(structure);
        if (this.buildManager.isUnbuildable(gameState, type))
            return false;

        if (gameState.isTemplateDisabled(type)) {
            this.buildManager.setUnbuildable(gameState, type, Infinity, "disabled");
            ////error("cantbuild1 " + structure);
            return false;
        }

        let template = gameState.getTemplate(type);
        if (!template) {
            this.buildManager.setUnbuildable(gameState, type, Infinity, "notemplate");
            ////error("cantbuild2 " + structure);
            return false;
        }

        if (!template.available(gameState)) {
            this.buildManager.setUnbuildable(gameState, type, 1, "tech");
            ////error("cantbuild3 " + structure);
            return false;
        }

        // build limits
        let limits = gameState.getEntityLimits();
        let category = template.buildCategory();
        if (category && limits[category] !== undefined && gameState.getEntityCounts()[category] >= limits[category]) {
            this.buildManager.setUnbuildable(gameState, type, 1, "limit");
            return false;
        }

        return true;
    };

    m.HQ.prototype.updateTerritories = function (gameState) {
        const around = [[-0.7, 0.7], [0, 1], [0.7, 0.7], [1, 0], [0.7, -0.7], [0, -1], [-0.7, -0.7], [-1, 0]];
        let alliedVictory = gameState.getAlliedVictory();
        let passabilityMap = gameState.getPassabilityMap();
        let width = this.territoryMap.width;
        let cellSize = this.territoryMap.cellSize;
        let insideSmall = Math.round(45 / cellSize);
        let insideLarge = Math.round(80 / cellSize);	// should be about the range of towers
        let expansion = 0;

        for (let j = 0; j < this.territoryMap.length; ++j) {
            if (this.borderMap.map[j] & m.outside_Mask)
                continue;
            if (this.borderMap.map[j] & m.fullFrontier_Mask)
                this.borderMap.map[j] &= ~m.fullFrontier_Mask;	// reset the frontier

            if (this.territoryMap.getOwnerIndex(j) != PlayerID) {
                // If this tile was already accounted, remove it
                if (this.basesMap.map[j] == 0)
                    continue;
                let base = this.getBaseByID(this.basesMap.map[j]);
                if (base) {
                    let index = base.territoryIndices.indexOf(j);
                    if (index != -1)
                        base.territoryIndices.splice(index, 1);
                    else
                        API3.warn(" problem in headquarters::updateTerritories for base " + this.basesMap.map[j]);
                }
                else
                    API3.warn(" problem in headquarters::updateTerritories without base " + this.basesMap.map[j]);
                this.basesMap.map[j] = 0;
            }
            else {
                // Update the frontier
                let ix = j % width;
                let iz = Math.floor(j / width);
                let onFrontier = false;
                for (let a of around) {
                    let jx = ix + Math.round(insideSmall * a[0]);
                    if (jx < 0 || jx >= width)
                        continue;
                    let jz = iz + Math.round(insideSmall * a[1]);
                    if (jz < 0 || jz >= width)
                        continue;
                    if (this.borderMap.map[jx + width * jz] & m.outside_Mask)
                        continue;
                    let territoryOwner = this.territoryMap.getOwnerIndex(jx + width * jz);
                    if (territoryOwner != PlayerID && !(alliedVictory && gameState.isPlayerAlly(territoryOwner))) {
                        this.borderMap.map[j] |= m.narrowFrontier_Mask;
                        break;
                    }
                    jx = ix + Math.round(insideLarge * a[0]);
                    if (jx < 0 || jx >= width)
                        continue;
                    jz = iz + Math.round(insideLarge * a[1]);
                    if (jz < 0 || jz >= width)
                        continue;
                    if (this.borderMap.map[jx + width * jz] & m.outside_Mask)
                        continue;
                    territoryOwner = this.territoryMap.getOwnerIndex(jx + width * jz);
                    if (territoryOwner != PlayerID && !(alliedVictory && gameState.isPlayerAlly(territoryOwner)))
                        onFrontier = true;
                }
                if (onFrontier && !(this.borderMap.map[j] & m.narrowFrontier_Mask))
                    this.borderMap.map[j] |= m.largeFrontier_Mask;

                // If this tile was not already accounted, add it.
                if (this.basesMap.map[j] != 0)
                    continue;
                let landPassable = false;
                let ind = API3.getMapIndices(j, this.territoryMap, passabilityMap);
                let access;
                for (let k of ind) {
                    if (!this.landRegions[gameState.ai.accessibility.landPassMap[k]])
                        continue;
                    landPassable = true;
                    access = gameState.ai.accessibility.landPassMap[k];
                    break;
                }
                if (!landPassable)
                    continue;
                let distmin = Math.min();
                let baseID;
                let pos = [cellSize * (j % width + 0.5), cellSize * (Math.floor(j / width) + 0.5)];
                for (let base of this.baseManagers) {
                    if (!base.anchor || !base.anchor.position())
                        continue;
                    if (base.accessIndex != access)
                        continue;
                    let dist = API3.SquareVectorDistance(base.anchor.position(), pos);
                    if (dist >= distmin)
                        continue;
                    distmin = dist;
                    baseID = base.ID;
                }
                if (!baseID)
                    continue;
                this.getBaseByID(baseID).territoryIndices.push(j);
                this.basesMap.map[j] = baseID;
                expansion++;
            }
        }

        if (!expansion)
            return;
        // We've increased our territory, so we may have some new room to build
        this.buildManager.resetMissingRoom(gameState);
        // And if sufficient expansion, check if building a new market would improve our present trade routes
        let cellArea = this.territoryMap.cellSize * this.territoryMap.cellSize;
        if (expansion * cellArea > 960)
            this.tradeManager.routeProspection = true;
    };

    /** Reassign territories when a base is going to be deleted */
    m.HQ.prototype.reassignTerritories = function (deletedBase) {
        let cellSize = this.territoryMap.cellSize;
        let width = this.territoryMap.width;
        for (let j = 0; j < this.territoryMap.length; ++j) {
            if (this.basesMap.map[j] != deletedBase.ID)
                continue;
            if (this.territoryMap.getOwnerIndex(j) != PlayerID) {
                API3.warn("Petra reassignTerritories: should never happen");
                this.basesMap.map[j] = 0;
                continue;
            }

            let distmin = Math.min();
            let baseID;
            let pos = [cellSize * (j % width + 0.5), cellSize * (Math.floor(j / width) + 0.5)];
            for (let base of this.baseManagers) {
                if (!base.anchor || !base.anchor.position())
                    continue;
                if (base.accessIndex != deletedBase.accessIndex)
                    continue;
                let dist = API3.SquareVectorDistance(base.anchor.position(), pos);
                if (dist >= distmin)
                    continue;
                distmin = dist;
                baseID = base.ID;
            }
            if (baseID) {
                this.getBaseByID(baseID).territoryIndices.push(j);
                this.basesMap.map[j] = baseID;
            }
            else
                this.basesMap.map[j] = 0;
        }
    };

    /**
     * returns the base corresponding to baseID
     */
    m.HQ.prototype.getBaseByID = function (baseID) {
        for (let base of this.baseManagers)
            if (base.ID == baseID)
                return base;

        return undefined;
    };

    /**
     * returns the number of bases with a cc
     * ActiveBases includes only those with a built cc
     * PotentialBases includes also those with a cc in construction
     */
    m.HQ.prototype.numActiveBases = function () {
        if (!this.turnCache.base)
            this.updateBaseCache();
        return this.turnCache.base.active;
    };

    m.HQ.prototype.numPotentialBases = function () {
        if (!this.turnCache.base)
            this.updateBaseCache();
        return this.turnCache.base.potential;
    };

    m.HQ.prototype.updateBaseCache = function () {
        this.turnCache.base = { "active": 0, "potential": 0 };
        for (let base of this.baseManagers) {
            if (!base.anchor)
                continue;
            ++this.turnCache.base.potential;
            if (base.anchor.foundationProgress() === undefined)
                ++this.turnCache.base.active;
        }
    };

    m.HQ.prototype.resetBaseCache = function () {
        this.turnCache.base = undefined;
    };

    /**
     * Count gatherers returning resources in the number of gatherers of resourceSupplies
     * to prevent the AI always reaffecting idle workers to these resourceSupplies (specially in naval maps).
     */
    m.HQ.prototype.assignGatherers = function () {
        for (let base of this.baseManagers) {
            for (let worker of base.workers.values()) {
                if (worker.unitAIState().split(".")[1] != "RETURNRESOURCE")
                    continue;
                let orders = worker.unitAIOrderData();
                if (orders.length < 2 || !orders[1].target || orders[1].target != worker.getMetadata(PlayerID, "supply"))
                    continue;
                this.AddTCGatherer(orders[1].target);
            }
        }
    };

    m.HQ.prototype.isDangerousLocation = function (gameState, pos, radius) {
        return this.isNearInvadingArmy(pos) || this.isUnderEnemyFire(gameState, pos, radius);
    };

    /** Check that the chosen position is not too near from an invading army */
    m.HQ.prototype.isNearInvadingArmy = function (pos) {
        for (let army of this.defenseManager.armies)
            if (army.foePosition && API3.SquareVectorDistance(army.foePosition, pos) < 12000)
                return true;
        return false;
    };

    m.HQ.prototype.isUnderEnemyFire = function (gameState, pos, radius = 0) {
        if (!this.turnCache.firingStructures)
            this.turnCache.firingStructures = gameState.updatingCollection("diplo-FiringStructures", API3.Filters.hasDefensiveFire(), gameState.getEnemyStructures());
        for (let ent of this.turnCache.firingStructures.values()) {
            let range = radius + ent.attackRange("Ranged").max;
            if (API3.SquareVectorDistance(ent.position(), pos) < range * range)
                return true;
        }
        return false;
    };

    /** Compute the capture strength of all units attacking a capturable target */
    m.HQ.prototype.updateCaptureStrength = function (gameState) {
        this.capturableTargets.clear();
        for (let ent of gameState.getOwnUnits().values()) {
            if (!ent.canCapture())
                continue;
            let state = ent.unitAIState();
            if (!state || !state.split(".")[1] || state.split(".")[1] != "COMBAT")
                continue;
            let orderData = ent.unitAIOrderData();
            if (!orderData || !orderData.length || !orderData[0].target)
                continue;
            let targetId = orderData[0].target;
            let target = gameState.getEntityById(targetId);
            if (!target || !target.isCapturable() || !ent.canCapture(target))
                continue;
            if (!this.capturableTargets.has(targetId))
                this.capturableTargets.set(targetId, {
                    "strength": ent.captureStrength() * m.getAttackBonus(ent, target, "Capture"),
                    "ents": new Set([ent.id()])
                });
            else {
                let capturableTarget = this.capturableTargets.get(target.id());
                capturableTarget.strength += ent.captureStrength() * m.getAttackBonus(ent, target, "Capture");
                capturableTarget.ents.add(ent.id());
            }
        }

        for (let [targetId, capturableTarget] of this.capturableTargets) {
            let target = gameState.getEntityById(targetId);
            let allowCapture;
            for (let entId of capturableTarget.ents) {
                let ent = gameState.getEntityById(entId);
                if (allowCapture === undefined)
                    allowCapture = m.allowCapture(gameState, ent, target);
                let orderData = ent.unitAIOrderData();
                if (!orderData || !orderData.length || !orderData[0].attackType)
                    continue;
                if ((orderData[0].attackType == "Capture") !== allowCapture)
                    ent.attack(targetId, allowCapture);
            }
        }

        this.capturableTargetsTime = gameState.ai.elapsedTime;
    };

    /** Some functions that register that we assigned a gatherer to a resource this turn */

    /** add a gatherer to the turn cache for this supply. */
    m.HQ.prototype.AddTCGatherer = function (supplyID) {
        if (this.turnCache.resourceGatherer && this.turnCache.resourceGatherer[supplyID] !== undefined)
            ++this.turnCache.resourceGatherer[supplyID];
        else {
            if (!this.turnCache.resourceGatherer)
                this.turnCache.resourceGatherer = {};
            this.turnCache.resourceGatherer[supplyID] = 1;
        }
    };

    /** remove a gatherer to the turn cache for this supply. */
    m.HQ.prototype.RemoveTCGatherer = function (supplyID) {
        if (this.turnCache.resourceGatherer && this.turnCache.resourceGatherer[supplyID])
            --this.turnCache.resourceGatherer[supplyID];
        else {
            if (!this.turnCache.resourceGatherer)
                this.turnCache.resourceGatherer = {};
            this.turnCache.resourceGatherer[supplyID] = -1;
        }
    };

    m.HQ.prototype.GetTCGatherer = function (supplyID) {
        if (this.turnCache.resourceGatherer && this.turnCache.resourceGatherer[supplyID])
            return this.turnCache.resourceGatherer[supplyID];

        return 0;
    };

    /** The next two are to register that we assigned a gatherer to a resource this turn. */
    m.HQ.prototype.AddTCResGatherer = function (resource) {
        if (this.turnCache["resourceGatherer-" + resource])
            ++this.turnCache["resourceGatherer-" + resource];
        else
            this.turnCache["resourceGatherer-" + resource] = 1;

        if (this.turnCache.currentRates)
            this.turnCache.currentRates[resource] += 0.5;
    };

    m.HQ.prototype.GetTCResGatherer = function (resource) {
        if (this.turnCache["resourceGatherer-" + resource])
            return this.turnCache["resourceGatherer-" + resource];

        return 0;
    };

    /**
     * flag a resource as exhausted
     */
    m.HQ.prototype.isResourceExhausted = function (resource) {
        if (this.turnCache["exhausted-" + resource] == undefined)
            this.turnCache["exhausted-" + resource] = this.baseManagers.every(base =>
                !base.dropsiteSupplies[resource].nearby.length &&
                !base.dropsiteSupplies[resource].medium.length &&
                !base.dropsiteSupplies[resource].faraway.length);

        return this.turnCache["exhausted-" + resource];
    };

    /**
     * Check if a structure in blinking territory should/can be defended (currently if it has some attacking armies around)
     */
    m.HQ.prototype.isDefendable = function (ent) {
        if (!this.turnCache.numAround)
            this.turnCache.numAround = {};
        if (this.turnCache.numAround[ent.id()] === undefined)
            this.turnCache.numAround[ent.id()] = this.attackManager.numAttackingUnitsAround(ent.position(), 130);
        return +this.turnCache.numAround[ent.id()] > 8;
    };

    /**
     * Get the number of population already accounted for
     */
    m.HQ.prototype.getAccountedPopulation = function (gameState) {
        if (this.turnCache.accountedPopulation == undefined) {
            let pop = gameState.getPopulation();
            for (let ent of gameState.getOwnTrainingFacilities().values()) {
                for (let item of ent.trainingQueue()) {
                    if (!item.unitTemplate)
                        continue;
                    let unitPop = gameState.getTemplate(item.unitTemplate).get("Cost/Population");
                    if (unitPop)
                        pop += item.count * unitPop;
                }
            }
            this.turnCache.accountedPopulation = pop;
        }
        return this.turnCache.accountedPopulation;
    };

    /**
     * Get the number of workers already accounted for
     */
    m.HQ.prototype.getAccountedWorkers = function (gameState) {
        if (this.turnCache.accountedWorkers == undefined) {
            let workers = gameState.getOwnEntitiesByRole("worker", true).length;
            for (let ent of gameState.getOwnTrainingFacilities().values()) {
                for (let item of ent.trainingQueue()) {
                    if (!item.metadata || !item.metadata.role || item.metadata.role != "worker")
                        continue;
                    workers += item.count;
                }
            }
            this.turnCache.accountedWorkers = workers;
        }
        return this.turnCache.accountedWorkers;
    };

    /**
     * Some functions are run every turn
     * Others once in a while
     */
    m.HQ.prototype.update = function (gameState, events) {
        Engine.ProfileStart("Headquarters update");
        this.turnCache = {};
        this.territoryMap = m.createTerritoryMap(gameState);
        let result = 0;

        this.checkEvents(gameState, events);
        //this.navalManager.checkEvents(gameState, queues, events);

        //if (gameState.ai.playedTurn % 4 == 0) {
        //    let foundations = gameState.getOwnEntities().filter(API3.Filters.isFoundation());
        //    this.GarrisonUnits(gameState);
        //    this.UpgradeUnits(gameState, queues);
        //    this.SummonerBuild(gameState, foundations);
        //    this.BuildOrder(gameState, foundations);
        //}

        // construction call list
        let path = this.queuedBuilding["path"];
        this.UpdateList(this.allBuilders);
        let startData = this.configData["StartStrategy"];

        // The AI should only build if it has a builder and it isnt defending
        if (this.allBuilders[0] != undefined && this.soldierState != 2)
        {
            if (startData.length >= this.startStrategyState) // construct from start strategy if still applicable
                this.ConstructFromStartStrategy(gameState, startData);
            else if (!path) // if we have a building queued, dont attempt to build anything else until this one has been attempted
            {
                result = gameState.ai.playedTurn % (6 * this.difficultyRatio);
                switch (result) // divide the workload using the ai turn result 
                {
                    case 0:
                        //this.SummonerPlan(gameState, queues);
                        if (this.CanPhaseUp(gameState) == false)
                            this.QueueBuildingFromConfig(gameState);
                        break;
                    case 1:
                        if (this.CanPhaseUp(gameState) == false)
                            this.ConstructDropsite(gameState);
                        break;
                    case 2:
                        this.ConstructHouse(gameState);
                        break;
                    case 3:
                        this.ConstructMarket(gameState);
                        break;
                    case 4:
                        this.ConstructField(gameState);
                        break;
                    case 5:
                        this.ConstructTower(gameState);
                        break;
                    default:
                        break;
                }
            }
            else // queued building present
            {
                if (result < 5) // only run if the result is lower than the supposed max result (lower difficulty should ignore function calls for numerous turns)
                {
                    // if the queued building could not be constructed, try to build either a market, house or field
                    if(this.ConstructQueuedBuilding(gameState, path, this.queuedBuilding["template"]) == "NaN")
                    {
                        this.ConstructHouse(gameState); // continue to build houses, fields even when something is queued
                        this.ConstructField(gameState);
                        this.ConstructMarket(gameState);
                    }
                }
            }
        }

        // unit training
        result = gameState.ai.playedTurn % (4 * this.difficultyRatio);
        switch (result)
        {
            case 0:
                this.TrainCitizens(gameState);
                break;
            case 1:
                this.TrainTraders(gameState);
                break;
            case 2:
                let resources = this.GetResourceData(gameState);
                if (this.CanPhaseUp(gameState) == false) // we dont want to train any soldier/hero esque units when we should phase up first
                    if (this.TrainHero(gameState, resources) == false) // if the AI trained a hero this turn, dont try to train a titan as well
                        this.TrainTitan(resources);
                break;
            case 3:
                    this.TrainUnits(gameState); 
                break;
            default:
                break;
        }

        //miscellaneous behaviour with low frequency
        result = gameState.ai.playedTurn % (10 * this.difficultyRatio);
        switch (result) {
            case 0:
                if (this.CanPhaseUp(gameState) == false && this.soldierState != 2) // dont research techs when the AI is defending or applicable for a phaseup
                    this.ResearchTechs(gameState);
                break;
            default:
        }

        // unit behaviour, higher frequency required
        result = gameState.ai.playedTurn % (2 * this.difficultyRatio);
        switch (result)
        {
            case 0:
                if (this.delayTrade != undefined) // reset to undefined after a single trade call, but can also be made into an integer to disable for x number of future calls
                {
                    this.delayTrade = undefined;
                    for (let trader2 of this.allTraders) // we have to stop the traders from moving one turn later
                        trader2.stopMoving();
                    break; // break here to prevent the walking order still being present and starting a vicious cycle
                }

                this.UpdateList(this.allTraders);

                if (this.allMarkets.length < 2) // markets are destroyed to the point where trading is no longer possible, so break here
                    break;

                let pos = this.GetCivilLocation();
                for (let trader of this.allTraders)
                {
                    if (trader.unitAIState().endsWith("WALKING")) // if a trader is being moved by force(usually by leavefoundation), stop all trade for a few turns
                    {
                        this.delayTrade = true; // forced move detected, disable trade for a turn
                       
                        for (let trader2 of this.allTraders)
                            trader2.move(pos[0], pos[1]);
                        break;
                    }

                    if (trader.isIdle())
                        trader.tradeRoute(this.currentTradeRoute[0], this.currentTradeRoute[1]); // apply trade route to this trader when idle
               }
                break;
            case 1:
                for (let resourceType of Resources.GetCodes())
                    this.GatherResourceType(resourceType, this.allGatherers[resourceType]);
                this.BuildFoundations(this.allFoundations);

                switch (this.soldierState) // soldier behaviour
                {
                    case 0: // idle
                        this.UpdateList(this.allSoldiers);
                        this.StartAttack(gameState);
                        let pos = this.GetCivilLocation();
                        for (let soldier of this.RunAsBattalion(this.allSoldiers)) // reapply retreat movement to all soldiers
                        {
                            if (!soldier.isIdle()) // unit has already been given an order, so no need to reapply retreat order
                                continue;

                            let distToCivil = API3.SquareVectorDistance(soldier.position(), pos);
                            if (distToCivil < 60 * 60) // if this soldier is already close enough to the idle position, dont give another move command
                                continue;

                            soldier.setStance("none"); // idle or retreating entities should not react to anything
                            soldier.move(pos[0], pos[1]);
                        }
                        break;
                    case 1: // attacking
                        this.UpdateList(this.allSoldiers);
                        this.UpdateList(this.allEnemySoldiers[this.targetedEnemyID], this.targetedEnemyID);
                        if (this.HasSoldierRatio(this.allEnemySoldiers[this.targetedEnemyID], 0.85) == false) // at least 85% of the enemies forces is required to continue the attack
                        {
                            this.Retreat();
                            break;
                        }

                        if (this.GetBattalionCount(this.allSoldiers) < 5) // dont bother attacking another target when own battalion size is below 5
                            break;
                        
                        this.attackTarget = this.UpdateSingle(this.attackTarget, this.targetedEnemyID);
                        if (this.attackTarget == undefined)
                        { // the targeted civil centre has been destroyed or captured, select a new attack target
                            this.StartAttack(gameState);
                            this.soldierState = 0;
                            break;
                        }

                        this.MoveToNextCheckpoint(gameState);
                        break;
                    case 2: // defending
                        this.UpdateList(this.allSoldiers);
                        this.DefendOrders();
                        break;
                }
                break;
            default:
        }

        result = gameState.ai.playedTurn % (20 * this.difficultyRatio);
        switch (result) {
            //if (this.Config.difficulty >= 4)
            //{
            //    let food, material, metal, rupees = 0;

            //    if (this.Config.difficulty == 4) {
            //        food = this.Config.ResourceHard.food;
            //        material = this.Config.ResourceHard.material;
            //        metal = this.Config.ResourceHard.metal;
            //        rupees = this.Config.ResourceHard.rupees;
            //    }
            //    else if (this.Config.difficulty == 5) {
            //        food = this.Config.ResourceVeryHard.food;
            //        material = this.Config.ResourceVeryHard.material;
            //        metal = this.Config.ResourceVeryHard.metal;
            //        rupees = this.Config.ResourceVeryHard.rupees;
            //    }

            //    Engine.PostCommand(PlayerID, { "type": "AddResource", "resourceType": "food", "amount": food });
            //    Engine.PostCommand(PlayerID, { "type": "AddResource", "resourceType": "wood", "amount": material });
            //    Engine.PostCommand(PlayerID, { "type": "AddResource", "resourceType": "stone", "amount": metal });
            //    Engine.PostCommand(PlayerID, { "type": "AddResource", "resourceType": "metal", "amount": rupees });
            //}

            // check the difference with total resources and ban resources that are above a certain total percentage using the ban system

            // barter first
            case 0:
                this.BarterResources(gameState, this.GetResourceData(gameState));
                break;
            // bartering was now updated by the resource data, run resource operations
            case 1:
                let resourceData = this.GetResourceData(gameState);
                this.SetResourceTypesBan(resourceData);
                this.SetTradingRates(gameState, resourceData);
                this.RefreshResourcePriorityList(resourceData);
                break;
            default:
                break;
        }    

        //this.trainMoreWorkers(gameState, queues);

        //if (this.numActiveBases() > 0) {    
            //if (gameState.ai.playedTurn % 4 == 1)
                //this.buildMoreHouses(gameState, queues);

            //if ((!this.saveResources || this.canBarter) && gameState.ai.playedTurn % 4 == 2)
                //this.buildFarmstead(gameState, queues);

            //if (this.needCorral && gameState.ai.playedTurn % 4 == 3)
                //this.manageCorral(gameState, queues);

            //if (!queues.minorTech.hasQueuedUnits() && gameState.ai.playedTurn % 5 == 1)
            //    this.researchManager.update(gameState, queues);
        //}

        //if (this.numPotentialBases() < 1 ||
        //    this.canExpand && gameState.ai.playedTurn % 10 == 7 && this.currentPhase > 1)
        //    this.checkBaseExpansion(gameState, queues);

        //if (this.currentPhase > 1 && gameState.ai.playedTurn % 3 == 0) {         
        //    if (!this.saveResources) {
        //        this.buildBlacksmith(gameState, queues);
        //        this.buildTemple(gameState, queues);
        //    }
        //}

        //this.tradeManager.update(gameState, events, queues);

        //this.garrisonManager.update(gameState, events);
        //this.defenseManager.update(gameState, events);

        //if (gameState.ai.playedTurn % 3 == 0) {
        //    let Buildings = gameState.getOwnStructures();
        //    let activeBases = this.numActiveBases();
        //    this.constructTrainingBuildings(gameState, queues, Buildings, activeBases);
        //    this.UpgradeBuildings(gameState, Buildings, activeBases);
        //    if (this.Config.difficulty > 0)
        //        this.buildDefenses(gameState, queues);
        //}

        //this.assignGatherers();
        //let nbBases = this.baseManagers.length;
        //let activeBase;	// We will loop only on 1 active base per turn
        //do {
        //    this.currentBase %= this.baseManagers.length;
        //    activeBase = this.baseManagers[this.currentBase++].update(gameState, queues, events);
        //    --nbBases;
        //    // TODO what to do with this.reassignTerritories(this.baseManagers[this.currentBase]);
        //}
        //while (!activeBase && nbBases != 0);

        //this.navalManager.update(gameState, queues, events);      

        Engine.ProfileStop();
    };

    m.HQ.prototype.Serialize = function () {
        let properties = {
            "phasing": this.phasing,
            "currentBase": this.currentBase,
            "lastFailedGather": this.lastFailedGather,
            "firstBaseConfig": this.firstBaseConfig,
            "supportRatio": this.supportRatio,
            "targetNumWorkers": this.targetNumWorkers,
            "fortStartTime": this.fortStartTime,
            "towerStartTime": this.towerStartTime,
            "fortressStartTime": this.fortressStartTime,
            "freeRangedUnits": this.freeRangedUnits,
            "configData": this.configData,
            "saveResources": this.saveResources,
            "saveSpace": this.saveSpace,
            "needCorral": this.needCorral,
            "needFarm": this.needFarm,
            "needFish": this.needFish,
            "maxFields": this.maxFields,
            "canExpand": this.canExpand,
            "canBuildUnits": this.canBuildUnits,
            "navalMap": this.navalMap,
            "landRegions": this.landRegions,
            "navalRegions": this.navalRegions,
            "decayingStructures": this.decayingStructures,
            "capturableTargets": this.capturableTargets,
            "allGatherers": this.allGatherers,
            "allSupplies": this.allSupplies,
            "capturableTargetsTime": this.capturableTargetsTime
        };

        let baseManagers = [];
        for (let base of this.baseManagers)
            baseManagers.push(base.Serialize());

        if (this.Config.debug == -100) {
            API3.warn(" HQ serialization ---------------------");
            API3.warn(" properties " + uneval(properties));
            API3.warn(" baseManagers " + uneval(baseManagers));
            API3.warn(" attackManager " + uneval(this.attackManager.Serialize()));
            API3.warn(" buildManager " + uneval(this.buildManager.Serialize()));
            API3.warn(" defenseManager " + uneval(this.defenseManager.Serialize()));
            API3.warn(" tradeManager " + uneval(this.tradeManager.Serialize()));
            API3.warn(" navalManager " + uneval(this.navalManager.Serialize()));
            API3.warn(" researchManager " + uneval(this.researchManager.Serialize()));
            API3.warn(" diplomacyManager " + uneval(this.diplomacyManager.Serialize()));
            API3.warn(" garrisonManager " + uneval(this.garrisonManager.Serialize()));
            API3.warn(" victoryManager " + uneval(this.victoryManager.Serialize()));
        }

        return {
            "properties": properties,

            "baseManagers": baseManagers,
            "attackManager": this.attackManager.Serialize(),
            "buildManager": this.buildManager.Serialize(),
            "defenseManager": this.defenseManager.Serialize(),
            "tradeManager": this.tradeManager.Serialize(),
            "navalManager": this.navalManager.Serialize(),
            "researchManager": this.researchManager.Serialize(),
            "diplomacyManager": this.diplomacyManager.Serialize(),
            "garrisonManager": this.garrisonManager.Serialize(),
            "victoryManager": this.victoryManager.Serialize(),
        };
    };

    m.HQ.prototype.Deserialize = function (gameState, data) {
        for (let key in data.properties)
            this[key] = data.properties[key];

        this.buildManager = new m.BuildManager();
        this.buildManager.Deserialize(data.buildManager);
    };

    return m;

}(CONQUESTAI);
