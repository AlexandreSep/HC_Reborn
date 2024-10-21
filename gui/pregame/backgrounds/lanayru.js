g_BackgroundLayerData.push(
	[
		{
			"offset": (time, width) => 0.07 * width * Math.cos(0.05 * time),
			"sprite": "background-lanayru-1",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => 0.53 * width * Math.cos(0.05 * time),
			"sprite": "background-lanayru-2",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => 0.22 * width * Math.cos(0.05 * time),
			"sprite": "background-lanayru-3",
			"tiling": false,
		},
		{
			"offset": (time, width) => -0.07 * width * Math.cos(0.05 * time),
			"sprite": "background-lanayru-4",
			"tiling": false,
		},	
		{
			"offset": (time, width) => -0.12 * width * Math.cos(0.05 * time),
			"sprite": "background-lanayru-5",
			"tiling": false,
		},	
	]);
