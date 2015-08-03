#GCode viewer
This app generates a 3D representation of GCode.

##Functionalities
The viewer can display the paths the bit will do and shows the total size of the
operation.

This app uses the [Gcode-To-Geometry
app](https://github.com/ShopBotTools/Handibot-GCode-To-Geometry). The GCode
commands supported are listed there.

The G0 paths are displayed by blue lines, the G1, G2 and G3 by white lines.

##How to use the app:
In your code you need to instantiate the class GCodeViewer.Viewer

    var viewer =  new = GCodeViewer.Viewer(container, widthCanvas, heightCanvas,
        callbackError, configuration);

The parameters are:
* **container** : domElement, the container of the viewer. **Warning**: in the
  style of the container, the position must be set as `absolute` or
  `relative`, else the position is automatically set to relative (this is
  needed for the GUI).
* **widthCanvas** : number, the width of the viewer
* **heightCanvas** : number, the width of the viewer
* **callbackError** : function, the callback function if an error occurs,
  should have one parameter: a string which will contain the error message
* **configuration** : object (optional), the configuration of the machine.
  Should be in the same format as the [Handibot Configuration
  Helper](https://github.com/ShopBotTools/Handibot-Configuration-Helper).
  If the board is set, a box representing the board will be displayed, the
  dimensions of the board are in **inches**.

Then, each time you will want to see the 3D representation of the GCode: set
the GCode of your viewer object then view the paths.

    viewer.setGCode(gcode);  //gcode is a string
    viewer.viewPaths();      //refresh the display

`setGCode` will remove everything displayed in the viewer (except the helpers).
`viewPaths` displays the paths.

##Example
The code in the `index.html` is pretty straightforward and should help a lot.

##TODO:
A lot of things can be added to this viewer:
* Improve the interface (camera, helpers, UI...)
* Ability to set initial position of the tool
* Display a bit and make it follow the path (while highlighting the GCode)
* Display the result of the cut by setting a type of bit
