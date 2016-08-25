# G-Code viewer
This app generates a 3D representation of G-Code.

## Functionalities
The viewer can display the paths the bit will do and shows the total size of the
operation.

This app uses the [Gcode-To-Geometry
app](https://github.com/ShopBotTools/Handibot-GCode-To-Geometry). The G-Code
commands supported are listed there.

The G0 paths are displayed by red lines, the G1, G2 and G3 by blue lines.

It is possible to see the animation of the bit during the operation. For
convenience, it is possible to see the command currently animated by toggling
the G-Code displayer. It is also possible to click on a G-Code line command to
have the animation starting direcly from this command.

## How to use the app:
In your code you need to instantiate the class G-CodeViewer.Viewer

    var viewer =  new = gcodeviewer.Viewer(container, widthCanvas, heightCanvas,
        callbackError, configuration, liveMode);

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
  If the board is set, a box representing the board will be displayed, the
  dimensions of the board are in **inches**.
* **liveMode** : boolean (optional), the viewer mode. If set true, the viewer
  will be in live mode (this mode is explain below), else it is in normal mode.
  By default, it is set to false.
* **inInch** : boolean (optional), how the unit is displayed. If set true, the
  unit will be displayed in inch. If set false, the unit will be displayed in
  millimeters. If not set (undefined), the unit will automatically be displayed
  according to the G-Code commands.

Then, each time you will want to see the 3D representation of the G-Code: set
the G-Code of your viewer object then view the paths through the callback
parameter.

    viewer.setGCode(gcode, callback);  //gcode is a string

`setGCode` will display the interpretation of the G-Code.

## The two modes

### Normal mode

The normal mode is used when wanting to display and analysis the path. The GUI
offers a lot of option for animation and it is possible to jump directly into a
command line.

### Live mode

The live mode is used when displaying the path virtually at the same time that
the machine processes the job. The GUI offers fewer options than the normal
mode (no animation, no possibility to jump into a command line).

To synchronize the viewer, use the ``livePreview`` method of the ``Viewer``
class. For example, if the class is instantiate to the object ``viewer``.

    viewer.livePreview(lineNumber);  //lineNumber is the command line number

If the commands at the line number are displayed, the method returns true, else
false. It is impossible to go backward (i.e. going to a previous line number
than the one displayed). Also, since the machine behaviour is not always the
same than the viewer behaviour, it is possible that the path currently
processed by the machine is not displayed.

## Behaviour

As previously mentionned, G-Code behaviour can be undetermined. Some code
supposely wrong can be processed by the machine. Therefore, the viewer should
be seen as a helper and not blindly trust.

## Example
The code in the `index.html` is pretty straightforward and should help a lot.
