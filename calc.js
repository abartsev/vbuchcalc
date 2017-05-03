$(document).ready(function() {
	
	$("p").each(function() {
		if ($(this).text() == "") $(this).remove();
	});
	
	$(".nalog_circle").each(function() {
		var topCenter = ($(this).height() - $(this).children().height())/2 - 2;
		$(this).children().css({paddingTop:topCenter});
	});
	
	//ховеры
	$(".calc_ip, .calc_ur, .dejtel_circle, .nalog_circle").hover(
		function() {$(this).addClass("js-hover")},
		function() {$(this).removeClass("js-hover")}
	);
	
	var nalogType, nalogTypeAndEnvd = false, sum = 0,
	dataCalc = {"about":"", "dejtel":"", "workers":"0"};

    $(".click:not(.activ)").on("click", function() {
		//количество работников
		if ($(this).data("type") == "workers") {
			if($(this).hasClass("activ")){
				$(".click.men").removeClass("activ active");
				dataCalc["workers"] = 0;
			} else {
				$(".click.men").removeClass("activ active");
				$(this).addClass("activ");
				var numb_men = $(this).data("content");
				for (var i = 1; i < numb_men; i++) {
					$(".work .men:nth-child("+i+")").addClass("active");
				}
				dataCalc["workers"] = $(this).data("content");
			}
			
		//вид и деятельность
		} else if ($(this).data("type") == "about" || $(this).data("type") == "dejtel") {
			if ($(this).hasClass("activ")) {
				//сбрасываем класс активности, очищаем запись в массиве
				$(this).removeClass("activ js-hover");
				dataCalc[$(this).data("type")] = "";
				
			} else {
				//добавляем класс активности, добавляем данные в массив
				$(this).addClass("activ").siblings().removeClass("activ");
				dataCalc[$(this).data("type")] = $(this).data("content");
				
				if ($(this).data("type") == "dejtel") {
					//Деятельность - НЕТ: количество операций обнуляется, ползунок деактивируется
					if ($(this).hasClass("activ") && $(this).data("content") == "noactive") {
						$("#scrol").slider("value",0);
						$(".block_calk.scrol .scrol-grey").show();
					}
					//Деятельность - ЕСТЬ и количество операций 0: количество операций = 1, ползунок активен
					if ($(this).hasClass("activ") && $(this).data("content") == "active" && $("#scrol").slider("value") == 0) {
						$("#scrol").slider("value",1);
						$(".block_calk.scrol .scrol-grey").hide();
					}
				}
			}
		
		//система налогообложения
		} else {
			if ($(this).hasClass("activ")) {
				$(this).removeClass("activ js-hover");
				if ($(".nalog_circle").hasClass("activ")) {
					$(".nalog_circle").each(function() {
						if ($(this).hasClass("activ"))
							nalogType = $(this).attr("id");
						if ($(this).attr("id") == "envd")
							nalogTypeAndEnvd = false;
					});
				} else {
					nalogType = "";
				}
			} else {
				if ($(this).attr("id") == "envd") {
					if (nalogType && nalogType != "envd") {
						nalogTypeAndEnvd = true;
					} else {
						nalogType = "envd";
						nalogTypeAndEnvd = false;
					}
				} else {
					$(".nalog_circle:not(#envd)").removeClass("activ");
					nalogType = $(this).attr("id");
					if ($(".nalog_circle#envd").hasClass("activ"))
						nalogTypeAndEnvd = true;
				}
				$(this).addClass("activ");
			}
		}
		
		check_calc();
	});


	//ползунок
	$("#scrol").slider({
		value: 0,			//Значение, которое будет выставлено слайдеру при загрузке
		min: 0,				//Минимально возможное значение на ползунке
		max: 200,			//Максимально возможное значение на ползунке
		step: 1,			//Шаг, с которым будет двигаться ползунок
		
		create: function(event, ui) {
			$(".scrol_sum").html($("#scrol").slider("value"));
		},
		
		slide: function(event, ui) {
			var X = ($("#scrol").width()/200)*ui.value;
			var leftPos = X  + 5 + 'px';
			$(".scrol_sum").html(ui.value).css({left:leftPos});
			check_calc();
		},

		start: function(event, ui) {
			$(".scrol_sum").show();
		},

		stop: function(event, ui) {
			$(".scrol_sum").hide();
			check_calc();
		}
	});
	
	
	function check_calc() {
		//выбрана система налогообложения, выбран тип и активность деятельности
		if (nalogType && dataCalc["about"] && dataCalc["dejtel"]) {
			update_calc(dataCalc["about"], dataCalc["dejtel"], dataCalc["workers"], nalogType, $("#scrol").slider("value"));
			
		} else {
			//очищаем блок результата
			$("#contentSlider").html("");
			$("#contentKvartal").html("");
		}
	}


	function update_calc(elemType, elemActive, elemWorkers, elemNalog, elemSlider) {
		var isWorkers, sum_kvart = 0, sum_ops = 0, countscrol = 0;
		
		$.get("/data2.json", {}, function(json) {
			
			//если нет операций - считаем, что нет активности
			if (!elemSlider) elemActive = "noactive";
						
			//забираем цифры из файла
			isWorkers = (elemWorkers > 0) ? "workers" : "noworkers";
			sum = json[0][elemType][elemActive][isWorkers][elemNalog];
			
			//если выбрано только ЕНВД, но для него нет значения
			if (elemNalog == "envd" && !sum) {
				$("#contentSlider").html("");
				$("#contentKvartal").html("");
				$(".nalog_circle#envd").removeClass("activ");
				return false;
			}
			
			//плюс за дополнительно выбранное ЕНВД
			if (nalogTypeAndEnvd && json[0][elemType][elemActive][isWorkers]["envdplus"])
				sum += json[0][elemType][elemActive][isWorkers]["envdplus"];
			
			//плюс за количество работников
			if (elemActive == "active" && elemWorkers > 4) {
				sum += (elemWorkers - 4) * 500;
			}
			
			//ОСНОВНОЙ РАСЧЁТ
			
			//деятельность ЕСТЬ
			if (elemActive == "active") {
				//плюс за количество операций
				if ($("#scrol").slider("value") != 0)
					sum_ops = slider_calc(elemSlider, elemType, elemWorkers, elemNalog);
				
				//особое условие для ИП + деят.ЕСТЬ + работники.НЕТ + ЕНВД
				if (elemType == "ip" && elemActive == "active" && elemWorkers == 0 && elemNalog == "envd") {
					$("#contentSlider").html(sum + sum_ops + " руб. за квартал");
				} else {
					$("#contentSlider").html(sum + sum_ops + " руб. за месяц");
				}
				
				$("#contentKvartal").html("");
				
			//деятельности НЕТ
			} else if (elemActive == "noactive") {
				//ИП
				if (elemType == "ip") {
					if (elemWorkers == 0) {
						if (elemNalog == "osno") {
							sum_kvart = 1200;
						}
					} else {
						sum_kvart = sum - 500;
					}
				//юрлицо
				} else if (elemType == "ur") {
					sum_kvart = sum - 500;
				}
				$("#contentSlider").html(sum + " руб. за годовую отчетность");
				if (sum_kvart) 
					$("#contentKvartal").html(sum_kvart + " руб. за квартальную отчетность");
				else
					$("#contentKvartal").html("");
			}
		});
	}
	
	
	function slider_calc(slVal, slType, slWorkers, slNalog) {
		countscrol = (slVal >= 20) ? parseInt(Math.ceil((slVal - 20) / 30)) : 0;
		
		// ИП, деятельность ЕСТЬ
		if (slType == "ip") {
			switch(slNalog) {
				case 'usn1': return countscrol*1000; break;
				case 'usn2': return countscrol*1500; break;
				case 'osno': return countscrol*2500; break;
				case 'envd': return 0; break;
			}
		
		// Юрлицо, деятельность ЕСТЬ
		} else {
			switch(slNalog) {
				case 'usn1': return countscrol*1500; break;
				case 'usn2': return countscrol*1500; break;
				case 'osno': return countscrol*2500; break;
				case 'envd': return countscrol*1500; break;
			}
		} 
	}

});