Ext.namespace("GEOR.Addons");

GEOR.Addons.profile = Ext.extend(GEOR.Addons.Base, {    
    control: null,
    item: null,
    wins: [],
    _configForm: null,
    _initialized: false,
    _parameters: null,
    _process: null,    
    _wps_url: null,
    _wps_identifier: null,    
    _itemToolDraw: null,
    _itemToolSelect: null,
    _itemToolUpload: null,
    _itemToolParameters: null,
    _colors: null,
    _drawLayer: null,
    _markersLayer: null,
    _resultLayer: null,    

    tr: function (str) {
         return OpenLayers.i18n(str);
    },

    /**
     * Method: describeProcess
     *
     * Parameters:
     * String url, String WPS identifier.
     */        
    describeProcess: function (url, identifier) {
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
                this.onDescribeProcess(process);
            },
            scope: this
        });
    },
    
    _findDataInputsByIdentifier:  function (datainputs, identifier) {
        var datainput = null;
        for (var i = 0; i < datainputs.length; i++) {
                if (datainputs[i].identifier === identifier) {
                    datainput = datainputs[i];
                    break;
                }
            }
        return datainput;
    },
    /**
     * Method: onDescribeProcess
     * Callback executed when the describeProcess response
     * is received.
     *
     * Parameters:
     * process - {described process}.
     */
    onDescribeProcess: function (process) {
            this._process = process;
            var referentiel = this._findDataInputsByIdentifier(process.dataInputs,"referentiel");            
            var referentielAV = [];
            for (var obj in referentiel.literalData.allowedValues) {
                referentielAV.push([obj]);
            }
            var distance = this._findDataInputsByIdentifier(process.dataInputs,"distance");
            var distanceAV = [];
            for (var obj in distance.literalData.allowedValues) {
                distanceAV.push([obj]);
            }
            this._parameters = {
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
            this._itemToolDraw.enable();
            this._itemToolParameters.enable();
            this._initialized = true;
    },
    /**
     * Method: createParametersForm
     * Return a Form with tool parameters
     *
     *
     */
    createParametersForm: function () {
            var referentielStore = new Ext.data.SimpleStore({
                fields: [{
                    name: "value",
                    mapping: 0
                }],
                data: this._parameters.referentiel.allowedValues
            });
            var pasStore = new Ext.data.SimpleStore({
                fields: [{
                    name: "value",
                    mapping: 0
                }],
                data: this._parameters.pas.allowedValues
            });
            var referentielCombo = new Ext.form.ComboBox({
                name: "referentiel",
                fieldLabel: this._parameters.referentiel.title,
                store: referentielStore,
                valueField: "value",
                value: this._parameters.referentiel.value,
                displayField: "value",
                editable: false,
                mode: "local",
                triggerAction: "all",
                listWidth: 167
            });
            var pasCombo = new Ext.form.ComboBox({
                name: "pas",
                fieldLabel: this._parameters.pas.title,
                store: pasStore,
                valueField: "value",
                value: this._parameters.pas.value,
                displayField: "value",
                editable: false,
                mode: "local",
                triggerAction: "all",
                listWidth: 167
            });
            this._configForm = new Ext.FormPanel({
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
                    text: this.tr("addonprofile.refresh"),
                    handler: function () {
                        this.updateGlobalConfig();
                    },
                    scope: this
                }]
            });
            return this._configForm;
   },
    
    /**
     * Method: getGraphicHandler
     * Retourne le nombre de profils créés dans le layer _drawLayer
     * La valeur retournée sert à définir la couleur du futur Graphique généré.
     */
    getGraphicHandler: function () {
            return this._drawLayer.features.length;
    },
    /**
     * Method: getColor
     * Retourne le code couleur à associer au profil
     *
     */
    getColor: function (nprofile) {
            var color;
            switch (nprofile) {
            case 1:
            case 2:
            case 3:
                color = this._colors[nprofile - 1];
                break;
            default:
                color = "FF7F50";
                break;
            }
            return color;
    },
    /**
     * Method: onNewLine
     * Callback executed when a new Line is drawned
     *
     * Parameters:
     * e - {OpenLayers.Layer.events}
     */
    onNewLine: function (e) {
            var feature = e.feature;            
            var graphicHandler = this.getGraphicHandler();
            var profileColor = this.getColor(graphicHandler);
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
            this._drawLayer.setZIndex(600);
            this._drawLayer.redraw();            
            var layers = [this._drawLayer, this._markersLayer, this._resultLayer];
            var chartWindow = new GEOR.Addons.profilechart(this.map,layers, this.options, profileColor, feature, graphicHandler, this._process);                
            chartWindow.events.on("wpssuccess", this._onCharWindowResponse, this);
            chartWindow.events.on("wpserror", this._onCharWindowError, this);
            chartWindow.events.on("wpsclose", this._onCharWindowClose, this);
            chartWindow.getProfile("new", this._parameters);            
    },
   
    _onCharWindowResponse: function (chartWindow) {
        chartWindow.chart().show();
        this.wins.push(chartWindow);
    },
    
    _onCharWindowClose: function (chartWindow) {        
        this.wins.remove(chartWindow);
    },
    
    _onCharWindowError: function (textError,chartWindow) {
        GEOR.util.errorDialog({
                title: this.tr("addonprofile.error"),
                msg: textError
            });
        chartWindow.destroy();
    },
   
    /**
     * Method: LoadGML
     * Charge une chaine GML dans un layer
     *
     * Parameters:
     * gmlText - String GML.
     */
    LoadGML: function (gmlText) {
            var features = new OpenLayers.Format.GML().read(gmlText);
            if (features.length <= 3) {
                this._drawLayer.addFeatures(features);
            } else {
                GEOR.util.errorDialog({
                    title: this.tr("addonprofile.error"),
                    msg: this.tr("addonprofile.error1") + " : " + features.length
                });
            }
     }, 
   
    /**
     * Method: updateupdateGlobalConfig
     * Modifie les valeurs Référentiel et pas
     *
     */
    updateGlobalConfig: function () {
            this._parameters.pas.value = this._configForm.getForm().findField("pas").getValue();
            this._parameters.referentiel.value = this._configForm.getForm().findField("referentiel").getValue();
            this._configForm.findParentByType('window').destroy();
    },
    
    /**
     * Method: createWPSControl
     * Crée un control drawFeature de type ligne
     * Parameters:
     * handlerType - {OpenLayers.Handler.Path}, map - {OpenLayers.Map} The map instance.
     */

    createWPSControl: function (handlerType) {
            var drawLineCtrl = new OpenLayers.Control.DrawFeature(this._drawLayer, handlerType, {
                featureAdded: function (e) {
                    drawLineCtrl.deactivate();
                },
                scope: this
            });
            return drawLineCtrl;
    },
    /**
     * Method: enableSelectionTool
     *
     * Retourne true si une sélection est effectuée dans le Panel Results
     * Parameters:
     * m - {OpenLayers.Map} The map instance.
     */
    enableSelectionTool: function () {
            var response = false;
            var vectors = this.map.getLayersByClass('OpenLayers.Layer.Vector');
            for (var i = 0; i < vectors.length; i++) { 
                if (vectors[i].selectedFeatures.length > 0) {                
                    response = true;
                    break;
                }
            }
            return response;
    },
    /**
     * Method: getProfileParameters
     *
     * Retourne les valeurs des paramètres de l"outil
     *
     */
    getProfileParameters: function () {
            var form = this.createParametersForm();
            var win = new Ext.Window({
                closable: true,                
                title: this.tr("addonprofile.parameterstool"),
                border: false,
                plain: true,
                region: "center",
                items: [form]
            });
            win.render(Ext.getBody());
            win.show();
    },
    /**
     * Method: getMapFeaturesSelection
     * Créé un profil pour chaque feature sélectionnée dans le Panel Results
     * Parameters:
     * map - {OpenLayers.Map} The map instance.
     */
    getMapFeaturesSelection: function () {
            var features = [];
            var vectors = this.map.getLayersByClass('OpenLayers.Layer.Vector');
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
                        this._drawLayer.addFeatures([feat]);
                        // Possibilité de faire un merge des features
                        // pour le moment chaque feature sélectionné génère un profil
                    } else {
                        GEOR.util.errorDialog({
                            title: this.tr("addonprofile.error"),
                            msg: this.tr("addonprofile.error2")
                        });
                    }
                }
            } else {
                GEOR.util.errorDialog({
                    title: this.tr("addonprofile.error"),
                    msg: this.tr("addonprofile.error2")
                });
            }
    },

    /**
     * Method: selectGMLFile
     * Sélectionne un fichier GML en local
     *
     */
    selectGMLFile: function () {
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
                        emptyText: this.tr("addonprofile.fileselection"),
                        fieldLabel: this.tr("addonprofile.file"),
                        buttonText: "...",
                        listeners: {
                            "fileselected": function (fb, v) {
                                file = fb.fileInput.dom.files[0]
                                myfilename = v;
                                var reader = new FileReader();
                                reader.scope = this.scope;
                                reader.onload = function (e) {
                                    var text = e.target.result;
                                    if (myfilename.search(".gml") != -1) {
                                        this.scope.LoadGML(text);
                                        fileWindow.hide();
                                    } else {
                                        GEOR.util.errorDialog({
                                            title: this.scope.tr("addonprofile.error"),
                                            msg: this.scope.tr("addonprofile.error4")
                                        });
                                    }

                                }
                                reader.readAsText(file, "UTF-8");

                            }
                        },
                        scope: this
                    }]
                });

                fileWindow = new Ext.Window({
                    closable: true,
                    width: 320,
                    title: this.tr("addonprofile.fileselection"),
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
        },
        //test
        _onResultPanelEvent: function (e) {
            alert(e.store.data.items[0].data.feature.id);            
        },
        
        
        init: function (record) {            
            var lang = OpenLayers.Lang.getCode()
            var title = record.get("title")[lang];
            var description = record.get("description")[lang];                      
            // LAYERS
            this._drawLayer = new OpenLayers.Layer.Vector("Profil", {
                displayInLayerSwitcher: false
            });
            this._drawLayer.setZIndex(600);
            this._resultLayer = new OpenLayers.Layer.Vector("Result", {
                displayInLayerSwitcher: false
            });
            this._resultLayer.setZIndex(601);            
            this._markersLayer = new OpenLayers.Layer.Markers("WpsMarker", {
                displayInLayerSwitcher: false
            });
            this._markersLayer.setZIndex(602);
                     
            // EVENT LAYER
            this._drawLayer.events.register("featureadded", this, this.onNewLine);
            
            this.map.addLayers([this._drawLayer, this._resultLayer, this._markersLayer]);
            this._colors = this.options.colors;
            this._wps_url = this.options.wpsurl;
            this._wps_identifier = this.options.identifier;             
            
            this._itemToolDraw = new Ext.menu.CheckItem(new GeoExt.Action({                        
                iconCls: "drawline",
                text: this.tr("addonprofile.drawprofile"),
                map: this.map,
                toggleGroup: "map",
                allowDepress: false,
                disabled: true,
                tooltip: this.tr("addonprofile.drawprofiletip"),
                control: this.createWPSControl(OpenLayers.Handler.Path)
            }));
                    
            this._itemToolSelect = new Ext.Action({                        
                iconCls: "geor-btn-metadata",
                text: this.tr("addonprofile.selecttoprofile"),
                allowDepress: false,
                tooltip: this.tr("addonprofile.selecttoprofiletip"),
                disabled: true,
                handler: function () {
                    this.getMapFeaturesSelection();
                },
                scope: this
            });
                    
            this._itemToolUpload = new Ext.Action({
                iconCls: "wps-uploadfile",                        
                text: this.tr("addonprofile.loadgml"),
                allowDepress: false,
                tooltip: this.tr("addonprofile.loadgmltip"),
                disabled: (window.File && window.FileReader && window.FileList) ? false : true,
                handler: function () {
                    this.selectGMLFile();
                },
                scope: this
            });
            
            this._itemToolParameters = new Ext.Action({                        
                iconCls: "geor-btn-query",
                text: this.tr("addonprofile.parameters"),
                allowDepress: false,
                disabled: true,
                tooltip: this.tr("addonprofile.parameterstip"),
                handler: function () {
                    this.getProfileParameters();
                },
                scope: this
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
                            (this.scope.enableSelectionTool() == true) ? this.scope._itemToolSelect.enable() : this.scope._itemToolSelect.disable();                            
                        }						
                    },
                    scope: this,
                    items: [ this._itemToolDraw, this._itemToolSelect, this._itemToolUpload, this._itemToolParameters]

                })
            });
            
            this.describeProcess(this._wps_url, this._wps_identifier);
            //GEOR.resultspanel.events.on("panel", _onResultPanelEvent);
            this.item = menuitems;
            return menuitems;
        }, 
        
        destroy: function () {            ;
            this._configForm = null;
            this.item = null;            
            Ext.each(this.wins, function(w, i) {w.destroy();});
            this._drawLayer.destroy();
            this._markersLayer.destroy();
            this._resultLayer.destroy();
            GEOR.Addons.Base.prototype.destroy.call(this);
        }
    
});
