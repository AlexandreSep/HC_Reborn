function Barter() {}

Barter.prototype.Schema =
	"<a:component type='system'/><empty/>";

/**
 * The "true price" is a base price of 100 units of resource (for the case of some resources being of more worth than others).
 * With current bartering system only relative values makes sense so if for example stone is two times more expensive than wood,
 * there will 2:1 exchange rate.
 *
 * Constant part of price percentage difference between true price and buy/sell price.
 * Buy price equal to true price plus constant difference.
 * Sell price equal to true price minus constant difference.
 */
Barter.prototype.CONSTANT_DIFFERENCE = 10;
/**
 * Additional difference of prices in percents, added after each deal to specified resource price.
 */
Barter.prototype.DIFFERENCE_PER_DEAL = 2;
/**
 * Price difference percentage which restored each restore timer tick
 */
Barter.prototype.DIFFERENCE_RESTORE = 0.5;
/**
 * Interval of timer which slowly restore prices after deals
 */
Barter.prototype.RESTORE_TIMER_INTERVAL = 5000;

Barter.prototype.Init = function()
{
	this.priceDifferences = {};
	for (let resource of Resources.GetBarterableCodes())
		this.priceDifferences[resource] = 0;
	this.restoreTimer = undefined;
};

Barter.prototype.GetPrices = function(cmpPlayer)
{
	let prices = { "buy": {}, "sell": {} };
	let multiplier = cmpPlayer.GetBarterMultiplier();
	for (let resource of Resources.GetBarterableCodes())
	{
		let truePrice = Resources.GetResource(resource).truePrice;
		prices.buy[resource] = truePrice * (100 + this.CONSTANT_DIFFERENCE + this.priceDifferences[resource]) * multiplier.buy[resource] / 100;
		prices.sell[resource] = truePrice * (100 - this.CONSTANT_DIFFERENCE + this.priceDifferences[resource]) * multiplier.sell[resource] / 100;
	}
	return prices;
};

Barter.prototype.ExchangeResources = function(playerID, resourceToSell, resourceToBuy, amount)
{
	if (amount <= 0)
	{
		warn("ExchangeResources: incorrect amount: " + uneval(amount));
		return;
	}

	let availResources = Resources.GetBarterableCodes();
	if (availResources.indexOf(resourceToSell) == -1)
	{
		warn("ExchangeResources: incorrect resource to sell: " + uneval(resourceToSell));
		return;
	}

	if (availResources.indexOf(resourceToBuy) == -1)
	{
		warn("ExchangeResources: incorrect resource to buy: " + uneval(resourceToBuy));
		return;
	}

	if (amount != 100 && amount != 500)
		return;

	let cmpPlayer = QueryPlayerIDInterface(playerID);
	if (!cmpPlayer || !cmpPlayer.CanBarter())
		return;

	let prices = this.GetPrices(cmpPlayer);
	let amountsToSubtract = {};
	amountsToSubtract[resourceToSell] = amount;
	if (cmpPlayer.TrySubtractResources(amountsToSubtract))
	{
		let amountToAdd = Math.round(prices.sell[resourceToSell] / prices.buy[resourceToBuy] * amount);
		cmpPlayer.AddResource(resourceToBuy, amountToAdd);

		// Display chat message to observers.
		let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
		if (cmpGUIInterface)
			cmpGUIInterface.PushNotification({
				"type": "barter",
				"players": [playerID],
				"amountGiven": amount,
				"amountGained": amountToAdd,
				"resourceGiven": resourceToSell,
				"resourceGained": resourceToBuy
			});

		let cmpStatisticsTracker = QueryPlayerIDInterface(playerID, IID_StatisticsTracker);
		if (cmpStatisticsTracker)
		{
			cmpStatisticsTracker.IncreaseResourcesSoldCounter(resourceToSell, amount);
			cmpStatisticsTracker.IncreaseResourcesBoughtCounter(resourceToBuy, amountToAdd);
		}

		let difference = this.DIFFERENCE_PER_DEAL * amount / 100;
		// Increase price difference for both exchange resources.
		// Overall price difference (dynamic +/- constant) can't exceed +-20%.
		//HC-code, replaced all 99 values to 20 (this means that buying can never go below 67 for 100 or above 100 for 100)
		this.priceDifferences[resourceToSell] -= difference;
		this.priceDifferences[resourceToSell] = Math.min(20 - this.CONSTANT_DIFFERENCE, Math.max(this.CONSTANT_DIFFERENCE - 20, this.priceDifferences[resourceToSell]));
		this.priceDifferences[resourceToBuy] += difference;
		this.priceDifferences[resourceToBuy] = Math.min(20 - this.CONSTANT_DIFFERENCE, Math.max(this.CONSTANT_DIFFERENCE - 20, this.priceDifferences[resourceToBuy]));
	}

	if (this.restoreTimer === undefined)
		this.restoreTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer).SetInterval(this.entity, IID_Barter, "ProgressTimeout", this.RESTORE_TIMER_INTERVAL, this.RESTORE_TIMER_INTERVAL, {});
};

Barter.prototype.ProgressTimeout = function(data)
{
	let needRestore = false;
	for (let resource of Resources.GetBarterableCodes())
	{
		// Calculate value to restore, it should be limited to [-DIFFERENCE_RESTORE; DIFFERENCE_RESTORE] interval
		let differenceRestore = Math.min(this.DIFFERENCE_RESTORE, Math.max(-this.DIFFERENCE_RESTORE, this.priceDifferences[resource]));
		differenceRestore = -differenceRestore;
		this.priceDifferences[resource] += differenceRestore;
		// If price difference still exists then set flag to run timer again
		if (this.priceDifferences[resource] != 0)
			needRestore = true;
	}

	if (!needRestore)
	{
		let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
		cmpTimer.CancelTimer(this.restoreTimer);
		this.restoreTimer = undefined;
	}
};

Engine.RegisterSystemComponentType(IID_Barter, "Barter", Barter);
