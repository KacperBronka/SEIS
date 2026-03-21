using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using Newtonsoft.Json;

namespace ProductApp
{
	public partial class MainWindow : Window
	{
		[DllImport("kernel32.dll")]
		private static extern bool AllocConsole();

		public bool Pelnoletniosc = false;

		public class Product
		{
			public required string Name { get; set; }
			public decimal Price { get; set; }
			public bool Restricted { get; set; }

			public override string ToString() => $"{Name} - {Price} zł";
		}

		public class AgeConfirmation
		{
			[JsonProperty("error")]
			public bool? Error { get; set; }

			[JsonProperty("age_check")]
			public bool AgeCheck { get; set; }
		}

		private List<Product> products = new List<Product>();
		private decimal total = 0;
		private readonly HttpClient httpClient = new HttpClient();
		private HttpListener listener;

		public MainWindow()
		{
			//AllocConsole();
			Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Aplikacja uruchomiona");

			InitializeComponent();
			LoadProducts();

			ProductComboBox.ItemsSource = products;
			ProductComboBox.DisplayMemberPath = "Name";

			UpdateTotal();
			StartHttpListener();
		}

		private void LoadProducts()
		{
			try
			{
				if (!File.Exists("products.json"))
					throw new FileNotFoundException("Nie znaleziono pliku products.json");

				string json = File.ReadAllText("products.json");
				var rawProducts = JsonConvert.DeserializeObject<List<string>>(json) ?? new List<string>();

				products = rawProducts
					.Where(line => !string.IsNullOrWhiteSpace(line))
					.Select(line =>
					{
						var parts = line.Split(';');
						if (parts.Length < 3) return null;

						decimal price = 0;
						bool restricted = false;
						decimal.TryParse(parts[1], out price);
						bool.TryParse(parts[2], out restricted);

						return new Product
						{
							Name = parts[0],
							Price = price,
							Restricted = restricted
						};
					})
					.Where(p => p != null)
					.ToList()!;

				Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Załadowano {products.Count} produktów");
			}
			catch (Exception ex)
			{
				Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] BŁĄD wczytywania produktów: {ex.Message}");
				MessageBox.Show("Błąd wczytywania produktów: " + ex.Message);
				products = new List<Product>();
			}
		}

		private void UpdateTotal()
		{
			TotalTextBlock.Text = $"Łączna suma: {total} zł";
		}

		private async void AddProduct_Click(object sender, RoutedEventArgs e)
		{
			if (ProductComboBox.SelectedItem is Product selectedProduct)
			{
				if (selectedProduct.Restricted && !Pelnoletniosc)
				{
					Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Produkt '{selectedProduct.Name}' wymaga weryfikacji wieku");
					bool confirmed = await WaitForAgeConfirmationAsync(selectedProduct.Name);
					if (!confirmed)
					{
						Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Weryfikacja nieudana – produkt nie dodany");
						return;
					}
				}

				CartListBox.Items.Add(selectedProduct);
				total += selectedProduct.Price;
				UpdateTotal();
				Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Dodano: {selectedProduct.Name} ({selectedProduct.Price} zł)");
			}
		}

		private async Task<bool> WaitForAgeConfirmationAsync(string productName)
		{
			var waitingWindow = new AutoCloseMessage(
				$"Produkt {productName} wymaga potwierdzenia wieku...\nZeskanuj aplikację w celu weryfikacji wieku",
				40000
			);
			waitingWindow.Show();

			bool result = false;
			DateTime startTime = DateTime.Now;
			TimeSpan maxWait = TimeSpan.FromSeconds(40);

			Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Oczekiwanie na potwierdzenie wieku (max 40s)...");

			while (DateTime.Now - startTime < maxWait)
			{
				if (Pelnoletniosc)
				{
					result = true;
					break;
				}

				await Task.Delay(200);
			}

			if (waitingWindow.IsVisible)
				waitingWindow.Close();

			string msg = result ? "Pełnoletność potwierdzona ✅" : "Brak potwierdzenia ❌";
			Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Wynik weryfikacji: {msg}");
			new AutoCloseMessage(msg, 2000).Show();

			Pelnoletniosc = result;
			return result;
		}

		private void StartHttpListener()
		{
			listener = new HttpListener();
			listener.Prefixes.Add("http://192.168.88.238:5001/receive/");
			listener.Start();

			Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Listener HTTP uruchomiony na http://192.168.88.238:5001/receive/");

			Task.Run(async () =>
			{
				while (true)
				{
					try
					{
						var context = await listener.GetContextAsync();
						string clientIp = context.Request.RemoteEndPoint?.ToString() ?? "nieznany";

						Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Przychodzące połączenie od {clientIp} [{context.Request.HttpMethod}]");

						if (context.Request.HttpMethod == "POST")
						{
							using var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding);
							string json = await reader.ReadToEndAsync();

							Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Odebrano JSON: {json}");

							var data = JsonConvert.DeserializeObject<AgeConfirmation>(json);
							if (data != null)
							{
								Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Sparsowano → error={data.Error}, age_check={data.AgeCheck}");

								if (data.Error is null)
								{
									Pelnoletniosc = data.AgeCheck;
									Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] → Pelnoletniosc ustawiona na: {Pelnoletniosc}");
								}
								else
								{
									Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] → Zignorowano (error=true)");
								}

								string responseString = JsonConvert.SerializeObject(new { success = true });
								byte[] buffer = Encoding.UTF8.GetBytes(responseString);
								context.Response.ContentType = "application/json";
								context.Response.ContentLength64 = buffer.Length;
								await context.Response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
								context.Response.Close();
							}
							else
							{
								Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] BŁĄD: nie udało się sparsować JSON");
								context.Response.StatusCode = 400;
								context.Response.Close();
							}
						}
						else
						{
							Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Odrzucono – metoda {context.Request.HttpMethod} niedozwolona");
							context.Response.StatusCode = 405;
							context.Response.Close();
						}
					}
					catch (Exception ex)
					{
						Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] BŁĄD listenera: {ex.Message}");
					}
				}
			});
		}
	}
}