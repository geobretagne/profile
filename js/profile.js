Ext.namespace("GEOR.Addons");

GEOR.Addons.profile = function (map, options) {
    this.map = map;    
    this.options = options;    
    this.item = null;    
    this.wins = [];
    this.configForm = null;    
    
};

GEOR.Addons.profile.prototype = (function () {

    /*
     * Private
     */
    /**
     * Property: _mask_loaders
     * Array of {Ext.LoadMask} .
     */
    
    var _self = null;    
    var _initialized = false;
    var _parameters = null;
    var _process = null;
    /**
     * Property: _map
     * {OpenLayers.Map} The map instance.
     */
    var _map = null;	
    

    /**
     * Property: url
     * String The WPS MNT instance.
     */
    var _wps_url = null;

    var _wps_identifier = null;
    
    var _itemToolDraw = null;    
    
    var _itemToolSelect = null;
    
    var _itemToolUpload = null;
    
    var _itemToolParameters = null;

    /**
     * Property: config
     *{Object} Hash of options, with keys: pas, referentiel.
     */

    var _config = null;

    /**
     * Property: colors
     *[Array] Hash of colors.
     */
    var _colors = null;

    /**
     * Property: _drawLayer
     * {OpenLayers.Layer.Vector}.
     */

    var _drawLayer = null;

    /**
     * Property: _markersLayer
     * {OpenLayers.Layer.Markers}.
     */
    var _markersLayer = null;

    var _resultLayer = null;  
    

    var tr = function (str) {
            return OpenLayers.i18n(str);
        };

    /**
     * Method: describeProcess
     *
     * Parameters:
     * String url, String WPS identifier.
     */        
    var describeProcess = function (url, identifier) {
        OpenLayers.Request.GET({
            url: url,
            params: {
                "SERVICE": "WPS",
                "REQUEST": "DescribeProcess",
                "VERSION": "1.0.0",
                "IDENTIFIER": identifier
            },
            success: function(response) {
                process = new OpenLayers.Format.WPSDescribeProcess().read(response.responseText).processDescriptions[identifier];
                onDescribeProcess(process);
            }
        });
    };
    
    var _findDataInputsByIdentifier = function (datainputs, identifier) {
        var datainput = null;
        for (var i = 0; i < datainputs.length; i++) {
                if (datainputs[i].identifier === identifier) {
                    datainput = datainputs[i];
                    break;
                }
            }
        return datainput;
    };
    /**
     * Method: onDescribeProcess
     * Callback executed when the describeProcess response
     * is received.
     *
     * Parameters:
     * process - {described process}.
     */
    var onDescribeProcess = function (process) {
            _process = process;
            var referentiel = _findDataInputsByIdentifier(process.dataInputs,"referentiel");            
            var referentielAV = [];
            for (var obj in referentiel.literalData.allowedValues) {
                referentielAV.push([obj]);
            }
            var distance = _findDataInputsByIdentifier(process.dataInputs,"distance");
            var distanceAV = [];
            for (var obj in distance.literalData.allowedValues) {
                distanceAV.push([obj]);
            }
            _parameters = {
                pas: {
                    value: parseInt(distanceAV.reverse()[0].toString()),
                    title: distance.title,
                    allowedValues: distanceAV
                },
                referentiel: {
                    value: referentielAV[0].toString(),
                    title: referentiel.title,
                    allowedValues: referentielAV
                }
            };
            _itemToolDraw.enable();
            _itemToolParameters.enable();
            _initialized = true;
        };
    /**
     * Method: createParametersForm
     * Return a Form with tool parameters
     *
     *
     */
    var createParametersForm = function () {
            var referentielStore = new Ext.data.SimpleStore({
                fields: [{
                    name: "value",
                    mapping: 0
                }],
                data: _parameters.referentiel.allowedValues
            });
            var pasStore = new Ext.data.SimpleStore({
                fields: [{
                    name: "value",
                    mapping: 0
                }],
                data: _parameters.pas.allowedValues
            });
            var referentielCombo = new Ext.form.ComboBox({
                name: "referentiel",
                fieldLabel: _parameters.referentiel.title,
                store: referentielStore,
                valueField: "value",
                value: _parameters.referentiel.value,
                displayField: "value",
                editable: false,
                mode: "local",
                triggerAction: "all",
                listWidth: 167
            });
            var pasCombo = new Ext.form.ComboBox({
                name: "pas",
                fieldLabel: _parameters.pas.title,
                store: pasStore,
                valueField: "value",
                value: _parameters.pas.value,
                displayField: "value",
                editable: false,
                mode: "local",
                triggerAction: "all",
                listWidth: 167
            });
            _configForm = new Ext.FormPanel({
                labelWidth: 100,
                layout: "form",
                bodyStyle: "padding: 10px",                
                height: 200,                
                defaults: {
                    width: 200
                },
                defaultType: "textfield",
                items: [referentielCombo, pasCombo],                
                buttons: [{
                    text: tr("addonprofile.refresh"),
                    handler: function () {
                        updateGlobalConfig();
                    }
                }]
            });
            return _configForm;
        };
    
    /**
     * Method: getGraphicHandler
     * Retourne le nombre de profils créés dans le layer _drawLayer
     * La valeur retournée sert à définir la couleur du futur Graphique généré.
     */
    var getGraphicHandler = function () {
            return _drawLayer.features.length;
        };
    /**
     * Method: getColor
     * Retourne le code couleur à associer au profil
     *
     */
    var getColor = function (nprofile) {
            var color;
            switch (nprofile) {
            case 1:
            case 2:
            case 3:
                color = _colors[nprofile - 1];
                break;
            default:
                color = "FF7F50";
                break;
            }
            return color;
        };
    /**
     * Method: onNewLine
     * Callback executed when a new Line is drawned
     *
     * Parameters:
     * e - {OpenLayers.Layer.events}
     */
    var onNewLine = function (e) {
            var feature = e.feature;            
            var graphicHandler = getGraphicHandler();
            var profileColor = getColor(graphicHandler);
            feature.style = {
                pointRadius: 10,
                fillColor: "green",
                fillOpacity: 0.5,
                strokeColor: "#" + profileColor
            };
            feature.attributes = {
                profile: graphicHandler,
                color: profileColor
            };
            _drawLayer.setZIndex(600);
            _drawLayer.redraw();            
            var layers = [_drawLayer,_markersLayer, _resultLayer];
            var chartWindow = new GEOR.Addons.profilechart(_map,layers, _config, profileColor, feature, graphicHandler, _process);                
            chartWindow.events.on("wpssuccess", _onCharWindowResponse);
            chartWindow.events.on("wpserror", _onCharWindowError);
            chartWindow.events.on("wpsclose", _onCharWindowClose);
            chartWindow.getProfile("new", _parameters);            
        };
   
    var _onCharWindowResponse = function (chartWindow) {
        chartWindow.chart().show();
        _self.wins.push(chartWindow);
    };
    
    var _onCharWindowClose = function (chartWindow) {        
        _self.wins.remove(chartWindow);
    };
    
    var _onCharWindowError = function (textError,chartWindow) {
        GEOR.util.errorDialog({
                title: tr("addonprofile.error"),
                msg: textError
            });
        chartWindow.destroy();
    };  
   
    /**
     * Method: LoadGML
     * Charge une chaine GML dans un layer
     *
     * Parameters:
     * gmlText - String GML.
     */
    var LoadGML = function (gmlText) {
            var features = new OpenLayers.Format.GML().read(gmlText);
            if (features.length <= 3) {
                _drawLayer.addFeatures(features);
            } else {
                GEOR.util.errorDialog({
                    title: tr("addonprofile.error"),
                    msg: tr("addonprofile.error1") + " : " + features.length
                });
            }
        };    
   
    /**
     * Method: updateupdateGlobalConfig
     * Modifie les valeurs Référentiel et pas
     *
     */
    var updateGlobalConfig = function () {
            _parameters.pas.value = _configForm.getForm().findField("pas").getValue();
            _parameters.referentiel.value = _configForm.getForm().findField("referentiel").getValue();
            _configForm.findParentByType('window').destroy();
    };
    
    /**
     * Method: createWPSControl
     * Crée un control drawFeature de type ligne
     * Parameters:
     * handlerType - {OpenLayers.Handler.Path}, map - {OpenLayers.Map} The map instance.
     */

    var createWPSControl = function (handlerType) {
            var drawLineCtrl = new OpenLayers.Control.DrawFeature(_drawLayer, handlerType, {
                featureAdded: function (e) {
                    drawLineCtrl.deactivate();
                }
            });
            return drawLineCtrl;
        };
    /**
     * Method: enableSelectionTool
     *
     * Retourne true si une sélection est effectuée dans le Panel Results
     * Parameters:
     * m - {OpenLayers.Map} The map instance.
     */
    var enableSelectionTool = function () {
            var response = false;
            var vectors = _map.getLayersByClass('OpenLayers.Layer.Vector');
            for (var i = 0; i < vectors.length; i++) { 
                if (vectors[i].selectedFeatures.length > 0) {                
                    response = true;
                    break;
                }
            }
            return response;
        };
    /**
     * Method: getProfileParameters
     *
     * Retourne les valeurs des paramètres de l"outil
     *
     */
    var getProfileParameters = function () {
            var form = createParametersForm();
            var win = new Ext.Window({
                closable: true,                
                title: tr("addonprofile.parameterstool"),
                border: false,
                plain: true,
                region: "center",
                items: [form]
            });
            win.render(Ext.getBody());
            win.show();
        };
    /**
     * Method: getMapFeaturesSelection
     * Créé un profil pour chaque feature sélectionnée dans le Panel Results
     * Parameters:
     * map - {OpenLayers.Map} The map instance.
     */
    var getMapFeaturesSelection = function () {
            var features = [];
            var vectors = _map.getLayersByClass('OpenLayers.Layer.Vector');
            for (var i = 0; i < vectors.length; i++) { 
                if (vectors[i].selectedFeatures.length > 0) {                
                    features = vectors[i].selectedFeatures;
                    break;
                }
            }
            if (features.length > 0) {
                for (var i = 0; i < features.length; i++) {
                    if (features[i].geometry.CLASS_NAME == "OpenLayers.Geometry.MultiLineString" || features[i].geometry.CLASS_NAME == "OpenLayers.Geometry.MultiLineString") {
                        var feat = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(features[i].geometry.getVertices()));
                        _drawLayer.addFeatures([feat]);
                        // Possibilité de faire un merge des features
                        // pour le moment chaque feature sélectionné génère un profil
                    } else {
                        GEOR.util.errorDialog({
                            title: tr("addonprofile.error"),
                            msg: tr("addonprofile.error2")
                        });
                    }
                }
            } else {
                GEOR.util.errorDialog({
                    title: tr("addonprofile.error"),
                    msg: tr("addonprofile.error2")
                });
            }
        };

    /**
     * Method: selectGMLFile
     * Sélectionne un fichier GML en local
     *
     */
    var selectGMLFile = function () {
            // Check for the various File API support.
            if (window.File && window.FileReader && window.FileList) {                
                var fileWindow;
                var fileLoadForm = new Ext.FormPanel({
                    width: 320,
                    frame: true,
                    bodyStyle: "padding: 10px 10px 0 10px;",
                    labelWidth: 60,
                    defaults: {
                        anchor: "95%"
                    },
                    items: [{
                        xtype: "fileuploadfield",
                        emptyText: tr("addonprofile.fileselection"),
                        fieldLabel: tr("addonprofile.file"),
                        buttonText: "...",
                        listeners: {
                            "fileselected": function (fb, v) {
                                file = fb.fileInput.dom.files[0]
                                myfilename = v;
                                var reader = new FileReader();
                                reader.onload = function (e) {
                                    var text = e.target.result;
                                    if (myfilename.search(".gml") != -1) {
                                        LoadGML(text);
                                        fileWindow.hide();
                                    } else {
                                        GEOR.util.errorDialog({
                                            title: tr("addonprofile.error"),
                                            msg: tr("addonprofile.error4")
                                        });
                                    }

                                }
                                reader.readAsText(file, "UTF-8");

                            }
                        }
                    }]
                });

                fileWindow = new Ext.Window({
                    closable: true,
                    width: 320,
                    title: tr("addonprofile.fileselection"),
                    border: false,
                    plain: true,
                    region: "center",
                    items: [fileLoadForm]
                });
                fileWindow.render(Ext.getBody());
                fileWindow.show();
            } else {
                alert("The File APIs are not fully supported in this browser.");
            }
        };
        //test
        var _onResultPanelEvent = function (e) {
            alert(e.store.data.items[0].data.feature.id);            
        };
   

    return {
        /*
         * Public
         */

        /**
         * APIMethod: create
         * Return a  {Ext.menu.Item} for GEOR_addonsmenu.js and initialize this module.16:21 13/06/2012
         *
         * Parameters:
         * m - {OpenLayers.Map} The map instance, {wpsconfig} the wps tool options.
         */
        init: function (record) {
            _self = this;
            var lang = OpenLayers.Lang.getCode()
            var title = record.get("title")[lang];
            var description = record.get("description")[lang];
            _map = this.map;
            _config = _self.options;           
            // LAYERS
            _drawLayer = new OpenLayers.Layer.Vector("Profil", {
                displayInLayerSwitcher: false
            });
            _drawLayer.setZIndex(600);
            _resultLayer = new OpenLayers.Layer.Vector("Result", {
                displayInLayerSwitcher: false
            });
            _resultLayer.setZIndex(601);            
            _markersLayer = new OpenLayers.Layer.Markers("WpsMarker", {
                displayInLayerSwitcher: false
            });
            _markersLayer.setZIndex(602);
                     
            // EVENT LAYER
            _drawLayer.events.register("featureadded", "", onNewLine);
            
            _map.addLayers([_drawLayer, _resultLayer,_markersLayer]);
            _colors = _config.colors;
            _wps_url = _config.wpsurl;
            _wps_identifier = _config.identifier;             
            
            _itemToolDraw = new Ext.menu.CheckItem(new GeoExt.Action({                        
                iconCls: "drawline",
                text: tr("addonprofile.drawprofile"),
                map: this.map,
                toggleGroup: "map",
                allowDepress: false,
                disabled: true,
                tooltip: tr("addonprofile.drawprofiletip"),
                control: createWPSControl(OpenLayers.Handler.Path)
            }));
                    
            _itemToolSelect = new Ext.Action({                        
                iconCls: "geor-btn-metadata",
                text: tr("addonprofile.selecttoprofile"),
                allowDepress: false,
                tooltip: tr("addonprofile.selecttoprofiletip"),
                disabled: true,
                handler: function () {
                    getMapFeaturesSelection();
                }
            });
                    
            _itemToolUpload = new Ext.Action({
                iconCls: "wps-uploadfile",                        
                text: tr("addonprofile.loadgml"),
                allowDepress: false,
                tooltip: tr("addonprofile.loadgmltip"),
                disabled: (window.File && window.FileReader && window.FileList) ? false : true,
                handler: function () {
                    selectGMLFile();
                }
            });
            
            _itemToolParameters = new Ext.Action({                        
                iconCls: "geor-btn-query",
                text: tr("addonprofile.parameters"),
                allowDepress: false,
                disabled: true,
                tooltip: tr("addonprofile.parameterstip"),
                handler: function () {
                    getProfileParameters();
                }
            });

            var menuitems = new Ext.menu.Item({
                text: title,               
                iconCls: "wps-linechart",
				qtip: description,
				listeners:{afterrender: function( thisMenuItem ) {
							Ext.QuickTips.register({
								target: thisMenuItem.getEl().getAttribute("id"),
								title: thisMenuItem.initialConfig.text,
								text: thisMenuItem.initialConfig.qtip
							});
						}
				},
                menu: new Ext.menu.Menu({
                    listeners: {
                        beforeshow: function () {
                            (enableSelectionTool() == true) ? _itemToolSelect.enable() : _itemToolSelect.disable();                            
                        }						
                    },
                    items: [ _itemToolDraw, _itemToolSelect, _itemToolUpload, _itemToolParameters]

                })
            });
            
            describeProcess(_wps_url, _wps_identifier);
            //GEOR.resultspanel.events.on("panel", _onResultPanelEvent);
            this.item = menuitems;
            return menuitems;
        },        
        destroy: function () {
            this.map = null;
            this.options = null;
            this.configForm = null;
            this.item = null;            
            Ext.each(this.wins, function(w, i) {w.destroy();});
            _drawLayer.destroy();
            _markersLayer.destroy();
            _resultLayer.destroy();
        }
    }
})();
