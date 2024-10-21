function ResourceDrain() {}

ResourceDrain.prototype.Schema =
	"<a:help>Provides a supply of one particular type of resource.</a:help>" +
	"<a:example>" +
		"<Amount>1000</Amount>" +
		"<Type>food.meat</Type>" +
		"<KillBeforeGather>false</KillBeforeGather>" +
		"<MaxGatherers>25</MaxGatherers>" +
		"<DiminishingReturns>0.8</DiminishingReturns>" +
	"</a:example>" +
	"<element name='Radius' a:help='The radius we want to check for resources'>" +
		"<data type='positiveInteger'/>" +
	"</element>"+
	"<element name='VisualEffectDuration' a:help='How long the visual effect shall last in milliseconds'>" +
		"<data type='positiveInteger'/>" +
	"</element>"+
	"<element name='TickRate' a:help='The radius we want to check for resources'>" +
		"<data type='positiveInteger'/>" +
	"</element>"+
	"<element name='DepleteResource' a:help='If set to true, the affected resources will be depleted'>" +
		"<data type='boolean'/>" +
	"</element>"+
    "<element name='MaxResourceSpotsToDrainSimultaneously' a:help='Trickle Rates'>" +
		Resources.BuildSchema("integer") +
	"</element>" +
    "<element name='ResourcesPerTick' a:help='Trickle Rates'>" +
		Resources.BuildSchema("nonNegativeDecimal") +
	"</element>";

ResourceDrain.prototype.Init = function()
{
    let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);

    this.depleteResource = (this.template.DepleteResource == "true");
    this.tickRate = +this.template.TickRate;
    this.visualEffectDuration = +this.template.VisualEffectDuration;
    this.timer = cmpTimer.SetInterval(this.entity, IID_ResourceDrain, "DrainResourcesInReach", 0, this.tickRate, null);

    this.players = [0,1,2,3,4,5,6,7,8,9];
};

ResourceDrain.prototype.DrainResourcesInReach = function()
{
    var cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);

    let radius = ApplyValueModificationsToEntity("ResourceDrain/Radius", +this.template.Radius, this.entity);
    let resourcesPerTick = new Array();
    resourcesPerTick["food"] = ApplyValueModificationsToEntity("ResourceDrain/ResourcesPerTick/food", +this.template.ResourcesPerTick.food, this.entity);
    resourcesPerTick["wood"] = ApplyValueModificationsToEntity("ResourceDrain/ResourcesPerTick/wood", +this.template.ResourcesPerTick.wood, this.entity);
    resourcesPerTick["stone"] = ApplyValueModificationsToEntity("ResourceDrain/ResourcesPerTick/stone", +this.template.ResourcesPerTick.stone, this.entity);
    resourcesPerTick["metal"] = ApplyValueModificationsToEntity("ResourceDrain/ResourcesPerTick/metal", +this.template.ResourcesPerTick.metal, this.entity);
    
    let maxResourceSpotsToDrainSimultaneously = new Array();
    maxResourceSpotsToDrainSimultaneously["food"] = ApplyValueModificationsToEntity("ResourceDrain/MaxResourceSpotsToDrainSimultaneously/food", +this.template.MaxResourceSpotsToDrainSimultaneously.food, this.entity);
    maxResourceSpotsToDrainSimultaneously["wood"] = ApplyValueModificationsToEntity("ResourceDrain/MaxResourceSpotsToDrainSimultaneously/wood", +this.template.MaxResourceSpotsToDrainSimultaneously.wood, this.entity);
    maxResourceSpotsToDrainSimultaneously["stone"] = ApplyValueModificationsToEntity("ResourceDrain/MaxResourceSpotsToDrainSimultaneously/stone", +this.template.MaxResourceSpotsToDrainSimultaneously.stone, this.entity);
    maxResourceSpotsToDrainSimultaneously["metal"] = ApplyValueModificationsToEntity("ResourceDrain/MaxResourceSpotsToDrainSimultaneously/metal", +this.template.MaxResourceSpotsToDrainSimultaneously.metal, this.entity);

    let currentlyDraining = new Array(); // Stores how many or each type we drain ant the moment
    currentlyDraining["food"]  = 0; 
    currentlyDraining["wood"]  = 0;
    currentlyDraining["stone"] = 0;
    currentlyDraining["metal"] = 0;
    
    let currentResourcesInReach = cmpRangeManager.ExecuteQuery(this.entity, 0, radius, this.players, IID_ResourceSupply);

    // Now drain each resource in reach if allowed
    for(let resource of currentResourcesInReach){
        let name = Engine.QueryInterface(resource, IID_Identity).GetGenericName();

        let cmpResourceSupply = Engine.QueryInterface(resource, IID_ResourceSupply);
        
        let resourceType = cmpResourceSupply.GetType();
        let resourceTypeGeneric = resourceType.generic;
        let resourceTypeSpecific = resourceType.specific;
        let resourceAmountAvailable = cmpResourceSupply.GetCurrentAmount();
        
        // If we have reached the limit fir that resource type, do not drain that resoruce
        if ( !(currentlyDraining[resourceTypeGeneric] < maxResourceSpotsToDrainSimultaneously[resourceTypeGeneric]) ){
            continue;
        }

        ++currentlyDraining[resourceTypeGeneric];

	let amountResourceTaken = {};
	amountResourceTaken.amount = 0;

	if (this.depleteResource){
	    amountResourceTaken = cmpResourceSupply.TakeResources(resourcesPerTick[resourceTypeGeneric]);
	} else {
	    amountResourceTaken.amount = resourcesPerTick[resourceTypeGeneric];
	}

        let cmpPlayer = QueryOwnerInterface(this.entity);
        cmpPlayer.AddResource(resourceTypeGeneric, amountResourceTaken.amount);

        // Add a visual indication
        cmpResourceSupply.IndicateResourceDrain(this.visualEffectDuration);
    }
    
}

Engine.RegisterComponentType(IID_ResourceDrain, "ResourceDrain", ResourceDrain);
