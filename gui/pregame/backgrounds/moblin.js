g_BackgroundLayerData.push(
	[
		{
			"offset": (time, width) => 0.07 * width * Math.cos(0.05 * time),
			"sprite": "background-moblin-1",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => 0.41 * width * Math.cos(0.05 * time),
			"sprite": "background-moblin-2",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => -0.03 * width * Math.cos(0.05 * time),
			"sprite": "background-moblin-3",
			"tiling": false,
		},
		{
			"offset": (time, width) => 0.31 * width * Math.cos(0.05 * time),
			"sprite": "background-moblin-4",
			"tiling": false,
		},	
		{
			"offset": (time, width) => -0.12 * width * Math.cos(0.05 * time),
			"sprite": "background-moblin-5",
			"tiling": false,
		},	
	]);
